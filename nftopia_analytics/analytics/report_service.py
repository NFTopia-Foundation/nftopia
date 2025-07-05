import os
import csv
import json
from datetime import datetime, timedelta
from decimal import Decimal
from io import BytesIO, StringIO
from typing import Dict, List, Any

import boto3
from django.conf import settings
from django.core.mail import EmailMessage
from django.db.models import Sum, Avg, Count, Q
from django.template.loader import render_to_string
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.barcharts import VerticalBarChart

from .models import AutomatedReport, ReportExecution
from sales.models import SalesEvent, SalesAggregate
from marketplace.models import Collection, NFTSale, NFTMint
from .models import UserSession, UserBehaviorMetrics, AnomalyDetection


class ReportGenerator:
    """Service for generating automated reports"""
    
    def __init__(self):
        self.s3_client = None
        if hasattr(settings, 'AWS_ACCESS_KEY_ID'):
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
            )
    
    def generate_report(self, report: AutomatedReport) -> ReportExecution:
        """Generate a report and return execution record"""
        execution = ReportExecution.objects.create(
            report=report,
            status='running'
        )
        
        try:
            # Generate data based on report type
            data = self._get_report_data(report)
            
            # Generate files
            files_generated = self._generate_files(report, data, execution)
            
            # Upload to S3 if configured
            if report.s3_bucket and self.s3_client:
                self._upload_to_s3(report, execution, files_generated)
            
            # Send notifications
            self._send_notifications(report, execution, files_generated)
            
            execution.status = 'completed'
            execution.completed_at = timezone.now()
            execution.data_points_processed = len(data.get('records', []))
            execution.recipients_notified = len(report.recipients)
            
        except Exception as e:
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.completed_at = timezone.now()
        
        execution.save()
        return execution
    
    def _get_report_data(self, report: AutomatedReport) -> Dict[str, Any]:
        """Get data for specific report type"""
        if report.report_type == 'daily_trading_volume':
            return self._get_daily_trading_volume_data()
        elif report.report_type == 'weekly_collection_performance':
            return self._get_weekly_collection_performance_data()
        elif report.report_type == 'monthly_user_activity':
            return self._get_monthly_user_activity_data()
        elif report.report_type == 'anomaly_detection_highlights':
            return self._get_anomaly_detection_data()
        else:
            raise ValueError(f"Unknown report type: {report.report_type}")
    
    def _get_daily_trading_volume_data(self) -> Dict[str, Any]:
        """Get daily trading volume data"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        daily_volumes = SalesAggregate.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).values('date').annotate(
            total_volume=Sum('total_volume'),
            total_sales=Sum('total_sales'),
            avg_price=Avg('average_price')
        ).order_by('date')
        
        # Top collections by volume
        top_collections = SalesAggregate.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).values('contract_address').annotate(
            total_volume=Sum('total_volume'),
            total_sales=Sum('total_sales')
        ).order_by('-total_volume')[:10]
        
        return {
            'title': 'Daily Trading Volume Report',
            'period': f"{start_date} to {end_date}",
            'daily_volumes': list(daily_volumes),
            'top_collections': list(top_collections),
            'summary': {
                'total_volume': sum(d['total_volume'] or 0 for d in daily_volumes),
                'total_sales': sum(d['total_sales'] or 0 for d in daily_volumes),
                'avg_daily_volume': sum(d['total_volume'] or 0 for d in daily_volumes) / len(daily_volumes) if daily_volumes else 0
            },
            'records': list(daily_volumes)
        }
    
    def _get_weekly_collection_performance_data(self) -> Dict[str, Any]:
        """Get weekly collection performance data"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(weeks=4)
        
        collections_data = []
        collections = Collection.objects.all()[:20]  # Top 20 collections
        
        for collection in collections:
            sales = NFTSale.objects.filter(
                collection=collection,
                timestamp__date__gte=start_date,
                timestamp__date__lte=end_date
            )
            
            mints = NFTMint.objects.filter(
                collection=collection,
                timestamp__date__gte=start_date,
                timestamp__date__lte=end_date
            )
            
            total_volume = sales.aggregate(Sum('sale_price'))['sale_price__sum'] or 0
            total_sales = sales.count()
            total_mints = mints.count()
            avg_price = sales.aggregate(Avg('sale_price'))['sale_price__avg'] or 0
            
            collections_data.append({
                'collection_name': collection.name,
                'total_volume': float(total_volume),
                'total_sales': total_sales,
                'total_mints': total_mints,
                'avg_price': float(avg_price),
                'floor_price': float(sales.aggregate(models.Min('sale_price'))['sale_price__min'] or 0)
            })
        
        return {
            'title': 'Weekly Collection Performance Report',
            'period': f"{start_date} to {end_date}",
            'collections': sorted(collections_data, key=lambda x: x['total_volume'], reverse=True),
            'records': collections_data
        }
    
    def _get_monthly_user_activity_data(self) -> Dict[str, Any]:
        """Get monthly user activity data"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        # User sessions data
        sessions = UserSession.objects.filter(
            login_at__date__gte=start_date,
            login_at__date__lte=end_date
        )
        
        daily_active_users = sessions.values('login_at__date').annotate(
            unique_users=Count('user', distinct=True)
        ).order_by('login_at__date')
        
        # User behavior metrics
        behavior_metrics = UserBehaviorMetrics.objects.filter(
            last_updated__date__gte=start_date
        )
        
        return {
            'title': 'Monthly User Activity Report',
            'period': f"{start_date} to {end_date}",
            'daily_active_users': list(daily_active_users),
            'total_sessions': sessions.count(),
            'unique_users': sessions.values('user').distinct().count(),
            'avg_session_duration': sessions.aggregate(Avg('session_duration'))['session_duration__avg'],
            'returning_users': behavior_metrics.filter(is_returning_user=True).count(),
            'records': list(daily_active_users)
        }
    
    def _get_anomaly_detection_data(self) -> Dict[str, Any]:
        """Get anomaly detection highlights"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)
        
        anomalies = AnomalyDetection.objects.filter(
            detected_at__gte=start_date,
            detected_at__lte=end_date
        ).order_by('-severity_score')
        
        anomaly_data = []
        for anomaly in anomalies:
            anomaly_data.append({
                'type': anomaly.anomaly_type,
                'severity': float(anomaly.severity_score),
                'detected_at': anomaly.detected_at.isoformat(),
                'description': anomaly.description,
                'status': anomaly.status
            })
        
        return {
            'title': 'Anomaly Detection Highlights',
            'period': f"{start_date.date()} to {end_date.date()}",
            'anomalies': anomaly_data,
            'total_anomalies': len(anomaly_data),
            'high_severity_count': len([a for a in anomaly_data if a['severity'] > 0.7]),
            'records': anomaly_data
        }
    
    def _generate_files(self, report: AutomatedReport, data: Dict[str, Any], execution: ReportExecution) -> Dict[str, str]:
        """Generate PDF and/or CSV files"""
        files = {}
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_filename = f"{report.report_type}_{timestamp}"
        
        if report.format in ['pdf', 'both']:
            pdf_path = self._generate_pdf(data, base_filename)
            files['pdf'] = pdf_path
            execution.pdf_file_path = pdf_path
        
        if report.format in ['csv', 'both']:
            csv_path = self._generate_csv(data, base_filename)
            files['csv'] = csv_path
            execution.csv_file_path = csv_path
        
        return files
    
    def _generate_pdf(self, data: Dict[str, Any], filename: str) -> str:
        """Generate PDF report"""
        filepath = f"/tmp/{filename}.pdf"
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.darkblue
        )
        story.append(Paragraph(data['title'], title_style))
        story.append(Paragraph(f"Period: {data['period']}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Summary section
        if 'summary' in data:
            story.append(Paragraph("Summary", styles['Heading2']))
            for key, value in data['summary'].items():
                story.append(Paragraph(f"{key.replace('_', ' ').title()}: {value}", styles['Normal']))
            story.append(Spacer(1, 20))
        
        # Data table
        if 'records' in data and data['records']:
            story.append(Paragraph("Detailed Data", styles['Heading2']))
            
            # Create table from records
            records = data['records'][:50]  # Limit to 50 records for PDF
            if records:
                headers = list(records[0].keys())
                table_data = [headers]
                
                for record in records:
                    row = [str(record.get(header, '')) for header in headers]
                    table_data.append(row)
                
                table = Table(table_data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 14),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                story.append(table)
        
        doc.build(story)
        return filepath
    
    def _generate_csv(self, data: Dict[str, Any], filename: str) -> str:
        """Generate CSV report"""
        filepath = f"/tmp/{filename}.csv"
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            if 'records' in data and data['records']:
                records = data['records']
                if records:
                    fieldnames = records[0].keys()
                    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                    writer.writeheader()
                    writer.writerows(records)
        
        return filepath
    
    def _upload_to_s3(self, report: AutomatedReport, execution: ReportExecution, files: Dict[str, str]):
        """Upload generated files to S3"""
        if not self.s3_client:
            return
        
        for file_type, filepath in files.items():
            key = f"{report.s3_prefix}/{os.path.basename(filepath)}"
            
            try:
                self.s3_client.upload_file(filepath, report.s3_bucket, key)
                url = f"https://{report.s3_bucket}.s3.amazonaws.com/{key}"
                
                if file_type == 'pdf':
                    execution.s3_pdf_url = url
                elif file_type == 'csv':
                    execution.s3_csv_url = url
                    
            except Exception as e:
                print(f"Failed to upload {file_type} to S3: {e}")
    
    def _send_notifications(self, report: AutomatedReport, execution: ReportExecution, files: Dict[str, str]):
        """Send email notifications with report attachments"""
        if not report.recipients:
            return
        
        subject = f"{report.get_report_type_display()} - {datetime.now().strftime('%Y-%m-%d')}"
        
        # Prepare email content
        context = {
            'report': report,
            'execution': execution,
            'generated_at': timezone.now()
        }
        
        html_content = render_to_string('analytics/email/report_notification.html', context)
        text_content = render_to_string('analytics/email/report_notification.txt', context)
        
        for recipient in report.recipients:
            if '@' in recipient:  # Email recipient
                email = EmailMessage(
                    subject=subject,
                    body=html_content,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@nftopia.com'),
                    to=[recipient]
                )
                email.content_subtype = 'html'
                
                # Attach files
                for file_type, filepath in files.items():
                    if os.path.exists(filepath):
                        email.attach_file(filepath)
                
                try:
                    email.send()
                except Exception as e:
                    print(f"Failed to send email to {recipient}: {e}")