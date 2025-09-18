from fastapi import FastAPI, APIRouter, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import os
import logging
import smtplib
import ssl
import email.mime.text
import email.mime.multipart
from pathlib import Path
import json
import uuid

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'sms_forwarder')]

# Create FastAPI app
app = FastAPI(title="SMS Mail Forwarder API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic Models
class SMSMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    forwarded: bool = False
    forwarded_at: Optional[datetime] = None
    email_status: str = "pending"  # pending, sent, failed
    error_message: Optional[str] = None

class SMSFilter(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    filter_type: str  # "sender", "keyword", "all"
    filter_value: Optional[str] = None
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EmailConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email_type: str  # "smtp", "emergent", "device"
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: bool = True
    recipient_email: EmailStr
    sender_name: str = "SMS Forwarder"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ForwardRequest(BaseModel):
    sender: str
    content: str
    timestamp: Optional[datetime] = None

class TestEmailRequest(BaseModel):
    recipient_email: EmailStr
    test_message: str = "This is a test email from SMS Mail Forwarder"

# Helper Functions
def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if isinstance(doc, dict):
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                doc[key] = str(value)
            elif isinstance(value, datetime):
                doc[key] = value.isoformat()
    return doc

async def check_sms_filters(sender: str, content: str) -> bool:
    """Check if SMS matches any active filters"""
    filters = await db.sms_filters.find({"enabled": True}).to_list(100)
    
    if not filters:
        return True  # Forward all if no filters
    
    for filter_doc in filters:
        filter_obj = SMSFilter(**filter_doc)
        
        if filter_obj.filter_type == "all":
            return True
        elif filter_obj.filter_type == "sender" and filter_obj.filter_value:
            if filter_obj.filter_value.lower() in sender.lower():
                return True
        elif filter_obj.filter_type == "keyword" and filter_obj.filter_value:
            if filter_obj.filter_value.lower() in content.lower():
                return True
    
    return False

async def send_email_smtp(config: EmailConfig, sms: SMSMessage) -> Dict[str, Any]:
    """Send email using SMTP configuration"""
    try:
        msg = MimeMultipart()
        msg['From'] = f"{config.sender_name} <{config.smtp_username}>"
        msg['To'] = config.recipient_email
        msg['Subject'] = f"SMS from {sms.sender}"
        
        body = f"""
SMS Forwarded Message

From: {sms.sender}
Received: {sms.timestamp.strftime('%Y-%m-%d %H:%M:%S')}

Message:
{sms.content}

---
This message was automatically forwarded by SMS Mail Forwarder
        """
        
        msg.attach(MimeText(body, 'plain'))
        
        # Create SMTP session
        if config.use_tls:
            context = ssl.create_default_context()
            server = smtplib.SMTP(config.smtp_server, config.smtp_port)
            server.starttls(context=context)
        else:
            server = smtplib.SMTP_SSL(config.smtp_server, config.smtp_port)
        
        server.login(config.smtp_username, config.smtp_password)
        server.send_message(msg)
        server.quit()
        
        return {"status": "sent", "message": "Email sent successfully"}
        
    except Exception as e:
        logger.error(f"SMTP email sending failed: {str(e)}")
        return {"status": "failed", "message": str(e)}

# API Routes
@api_router.get("/")
async def root():
    return {"message": "SMS Mail Forwarder API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# SMS Routes
@api_router.post("/sms/forward", response_model=Dict[str, Any])
async def forward_sms(request: ForwardRequest):
    """Forward SMS to configured email"""
    try:
        # Create SMS record
        sms = SMSMessage(
            sender=request.sender,
            content=request.content,
            timestamp=request.timestamp or datetime.utcnow()
        )
        
        # Check filters
        should_forward = await check_sms_filters(sms.sender, sms.content)
        
        if not should_forward:
            # Store but don't forward
            sms_dict = sms.dict()
            sms_dict['email_status'] = 'filtered'
            await db.sms_messages.insert_one(sms_dict)
            return {"status": "filtered", "message": "SMS filtered, not forwarded"}
        
        # Get email configuration
        email_config_doc = await db.email_configs.find_one({}, sort=[("updated_at", -1)])
        if not email_config_doc:
            sms_dict = sms.dict()
            sms_dict['email_status'] = 'no_config'
            await db.sms_messages.insert_one(sms_dict)
            raise HTTPException(status_code=400, detail="No email configuration found")
        
        email_config = EmailConfig(**email_config_doc)
        
        # Send email based on configuration type
        if email_config.email_type == "smtp":
            result = await send_email_smtp(email_config, sms)
        else:
            result = {"status": "failed", "message": f"Email type {email_config.email_type} not implemented yet"}
        
        # Update SMS record
        sms.forwarded = result["status"] == "sent"
        sms.forwarded_at = datetime.utcnow() if sms.forwarded else None
        sms.email_status = result["status"]
        sms.error_message = result["message"] if result["status"] == "failed" else None
        
        # Store SMS record
        await db.sms_messages.insert_one(sms.dict())
        
        return {
            "status": result["status"],
            "message": result["message"],
            "sms_id": sms.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error forwarding SMS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/sms/messages", response_model=List[Dict[str, Any]])
async def get_sms_messages(limit: int = 100, skip: int = 0):
    """Get SMS message history"""
    try:
        messages = await db.sms_messages.find().sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        return [serialize_doc(msg) for msg in messages]
    except Exception as e:
        logger.error(f"Error fetching SMS messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/sms/stats")
async def get_sms_stats():
    """Get SMS forwarding statistics"""
    try:
        total_count = await db.sms_messages.count_documents({})
        forwarded_count = await db.sms_messages.count_documents({"forwarded": True})
        failed_count = await db.sms_messages.count_documents({"email_status": "failed"})
        
        # Today's stats
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = await db.sms_messages.count_documents({"timestamp": {"$gte": today_start}})
        today_forwarded = await db.sms_messages.count_documents({
            "timestamp": {"$gte": today_start},
            "forwarded": True
        })
        
        return {
            "total_messages": total_count,
            "forwarded_messages": forwarded_count,
            "failed_messages": failed_count,
            "today_messages": today_count,
            "today_forwarded": today_forwarded,
            "forwarding_rate": (forwarded_count / total_count * 100) if total_count > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error fetching SMS stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Email Configuration Routes
@api_router.post("/email/config", response_model=Dict[str, Any])
async def save_email_config(config: EmailConfig):
    """Save email configuration"""
    try:
        config.updated_at = datetime.utcnow()
        config_dict = config.dict()
        
        # Remove existing config and save new one
        await db.email_configs.delete_many({})
        result = await db.email_configs.insert_one(config_dict)
        
        return {"status": "success", "config_id": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"Error saving email config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/email/config", response_model=Dict[str, Any])
async def get_email_config():
    """Get current email configuration"""
    try:
        config = await db.email_configs.find_one({}, sort=[("updated_at", -1)])
        if not config:
            return {"status": "not_configured"}
        
        # Remove sensitive data before returning
        config_safe = serialize_doc(config)
        if 'smtp_password' in config_safe:
            config_safe['smtp_password'] = '***masked***' if config_safe['smtp_password'] else None
        
        return {"status": "configured", "config": config_safe}
    except Exception as e:
        logger.error(f"Error fetching email config: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/email/test")
async def test_email(request: TestEmailRequest):
    """Test email configuration"""
    try:
        # Get email configuration
        email_config_doc = await db.email_configs.find_one({}, sort=[("updated_at", -1)])
        if not email_config_doc:
            raise HTTPException(status_code=400, detail="No email configuration found")
        
        email_config = EmailConfig(**email_config_doc)
        
        # Create test SMS
        test_sms = SMSMessage(
            sender="Test Sender",
            content=request.test_message,
            timestamp=datetime.utcnow()
        )
        
        # Override recipient email for test
        email_config.recipient_email = request.recipient_email
        
        if email_config.email_type == "smtp":
            result = await send_email_smtp(email_config, test_sms)
        else:
            result = {"status": "failed", "message": f"Email type {email_config.email_type} not implemented yet"}
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Filter Routes
@api_router.post("/filters", response_model=Dict[str, Any])
async def create_filter(filter_obj: SMSFilter):
    """Create SMS filter"""
    try:
        filter_dict = filter_obj.dict()
        result = await db.sms_filters.insert_one(filter_dict)
        return {"status": "success", "filter_id": str(result.inserted_id)}
    except Exception as e:
        logger.error(f"Error creating filter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/filters", response_model=List[Dict[str, Any]])
async def get_filters():
    """Get all SMS filters"""
    try:
        filters = await db.sms_filters.find().sort("created_at", -1).to_list(100)
        return [serialize_doc(filter_doc) for filter_doc in filters]
    except Exception as e:
        logger.error(f"Error fetching filters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/filters/{filter_id}", response_model=Dict[str, Any])
async def update_filter(filter_id: str, filter_update: Dict[str, Any]):
    """Update SMS filter"""
    try:
        result = await db.sms_filters.update_one(
            {"id": filter_id},
            {"$set": filter_update}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Filter not found")
        
        return {"status": "success", "updated": result.modified_count > 0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating filter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/filters/{filter_id}")
async def delete_filter(filter_id: str):
    """Delete SMS filter"""
    try:
        result = await db.sms_filters.delete_one({"id": filter_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Filter not found")
        
        return {"status": "success", "deleted": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting filter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include router
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)