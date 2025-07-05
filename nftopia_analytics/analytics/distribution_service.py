import os
import boto3
from typing import List, Dict, Any
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

import logging

logger = logging.getLogger(__name__)


class DistributionService:
    """Handle report distribution via email and S3"""
    
    def __init__(self):
        self.s3_client = None
        if hasattr(settings, 'AWS_ACCESS_KEY_ID'):
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
            )
    
    def distribute_report(self, report_config: Dict[str, Any], files: Dict[str, str]) -> Dict[str, Any]:
        """Distribute report based on configuration"""
        distribution_method = report_config.get('distribution_method', 'email')
        results = {'email': None, 's3': None}
        
        try:
            if distribution_method in ['email', 'both']:
                results['email'] = self._send_email_report(report_config, files)
            
            if distribution_method in ['s3', 'both'] and self.s3_client:
                results['s3'] = self._upload_to_s3(report_config, files)
            
            return {
                'status': 'success',
                'results': results,
                'distributed_at': timezone.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Distribution failed: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'results': results
            }
    
    def _send_email_report(self, report_config: Dict[str, Any], files: Dict[str, str]) -> Dict[str, Any]:
        """Send report via email"""
        recipients = report_config.get('recipients', [])
        if not recipients:
            return {'status': 'skipped', 'reason': 'No recipients configured'}
        
        subject = f"NFTopia Analytics Report - {report_config['report_type'].replace('_', ' ').title()}"
        
        # Create email content
        context = {
            'report_name': report_config.get('name', 'Analytics Report'),
            'report_type': report_config['report_type'],
            'generated_at': timezone.now(),
            'files': files
        }
        
        html_content = render_to_string('analytics/email/report_email.html', context)
        text_content = render_to_string('analytics/email/report_email.txt', context)
        
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@nftopia.com'),
                to=recipients
            )
            
            email.attach_alternative(html_content, "text/html")
            
            # Attach files
            for file_type, file_path in files.items():
                if os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        filename = os.path.basename(file_path)
                        email.attach(filename, f.read(), self._get_mime_type(file_type))
            
            email.send()
            
            return {
                'status': 'success',
                'recipients_count': len(recipients),
                'sent_at': timezone.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Email sending failed: {str(e)}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _upload_to_s3(self, report_config: Dict[str, Any], files: Dict[str, str]) -> Dict[str, Any]:
        """Upload report files to S3"""
        if not self.s3_client:
            return {'status': 'error', 'error': 'S3 client not configured'}
        
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', 'nftopia-reports')
        uploaded_files = {}
        
        try:
            for file_type, file_path in files.items():
                if os.path.exists(file_path):
                    filename = os.path.basename(file_path)
                    s3_key = f"reports/{report_config['report_type']}/{timezone.now().strftime('%Y/%m/%d')}/{filename}"
                    
                    self.s3_client.upload_file(
                        file_path,
                        bucket_name,
                        s3_key,
                        ExtraArgs={'ContentType': self._get_mime_type(file_type)}
                    )
                    
                    # Generate presigned URL (valid for 7 days)
                    url = self.s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': bucket_name, 'Key': s3_key},
                        ExpiresIn=7*24*3600  # 7 days
                    )
                    
                    uploaded_files[file_type] = {
                        'url': url,
                        's3_key': s3_key,
                        'filename': filename
                    }
            
            return {
                'status': 'success',
                'uploaded_files': uploaded_files,
                'bucket': bucket_name,
                'uploaded_at': timezone.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"S3 upload failed: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'uploaded_files': uploaded_files
            }
    
    def _get_mime_type(self, file_type: str) -> str:
        """Get MIME type for file type"""
        mime_types = {
            'pdf': 'application/pdf',
            'csv': 'text/csv'
        }
        return mime_types.get(file_type, 'application/octet-stream')