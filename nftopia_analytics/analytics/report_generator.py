import os
import csv
import json
from datetime import datetime, timedelta
from decimal import Decimal
from io import BytesIO, StringIO
from typing import Dict, List, Any, Optional

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.barcharts import VerticalBarChart

from django.conf import settings
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Max, Min
from django.template.loader import render_to_string

from sales.models import SalesEvent, SalesAggregate
from marketplace.models import Collection, NFTMint, NFTSale
from analytics.models import UserSession, UserBehaviorMetrics, AnomalyDetection
from .models import ReportTemplate


class ReportGenerator:
    """Main report generation service"""
    
    def __init__(self):
        self.output_dir = os.path.join(settings.BASE_DIR, 'reports')
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Set up matplotlib for server environment
        plt.switch_backend('Agg')
        sns.set_style("whitegrid")
    
    def generate_report(self, report_config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate report based on configuration"""
        report_type = report_config['report_type']
        format_type = report_config.get('format', 'pdf')
        
        # Get data based on report type
        data = self._get_report_data(report_type, report_config)
        
        # Generate files
        files = {}
        
        if format_type in ['pdf', 'both']:
            pdf_path = self._generate_pdf_report(report_type, data, report_config)
            files['pdf'] = pdf_path
        
        if format_type in ['csv', 'both']:
            csv_path = self._generate_csv_report(report_type, data, report_config)
            files['csv'] = csv_path
        
        return {
            'files': files,
            'data_summary': self._get_data_summary(data),
            'generated_at': timezone.now().isoformat()
        }
    
    def _get_report_data(self, report_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Get data for specific report type"""
        if report_type == 'daily_trading_volume':
            return self._get_daily_trading_volume_data()
        elif report_type == 'weekly_collection_performance':
            return self._get_weekly_collection_performance_data()
        elif report_type == 'monthly_user_activity':
            return self._get_monthly_user_activity_data()
        elif report_type == 'anomaly_detection_highlights':
            return self._get_anomaly_detection_data()
        else:
            raise ValueError(f"Unknown report type: {report_type}")
    
    def _get_daily_trading_volume_data(self) -> Dict[str, Any]:
        """Get daily trading volume data"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        # Get daily aggregates
        daily_sales = SalesAggregate.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).values('date').annotate(
            total_volume=Sum('total_volume'),
            total_sales=Sum('total_sales'),
            avg_price=Avg('average_price')
        ).order_by('date')
        
        # Get top collections by volume
        top_collections = SalesAggregate.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).values('contract_address').annotate(
            total_volume=Sum('total_volume'),
            total_sales=Sum('total_sales')
        ).order_by('-total_volume')[:10]
        
        # Calculate trends
        recent_volume = sum(item['total_volume'] or 0 for item in daily_sales[-7:])
        previous_volume = sum(item['total_volume'] or 0 for item in daily_sales[-14:-7])
        volume_change = ((recent_volume - previous_volume) / previous_volume * 100) if previous_volume > 0 else 0
        
        return {
            'daily_sales': list(daily_sales),
            'top_collections': list(top_collections),
            'summary': {
                'total_volume': sum(item['total_volume'] or 0 for item in daily_sales),
                'total_sales': sum(item['total_sales'] or 0 for item in daily_sales),
                'volume_change_7d': volume_change,
                'period': f"{start_date} to {end_date}"
            }
        }
    
    def _get_weekly_collection_performance_data(self) -> Dict[str, Any]:
        """Get weekly collection performance data"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(weeks=4)
        
        # Get collection performance
        collections = Collection.objects.all()
        collection_data = []
        
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
            
            collection_data.append({
                'name': collection.name,
                'total_volume': float(total_volume),
                'total_sales': total_sales,
                'total_mints': total_mints,
                'avg_price': float(avg_price),
                'floor_price': float(sales.aggregate(Min('sale_price'))['sale_price__min'] or 0),
                'ceiling_price': float(sales.aggregate(Max('sale_price'))['sale_price__max'] or 0)
            })
        
        # Sort by volume
        collection_data.sort(key=lambda x: x['total_volume'], reverse=True)
        
        return {
            'collections': collection_data,
            'summary': {
                'total_collections': len(collection_data),
                'active_collections': len([c for c in collection_data if c['total_sales'] > 0]),
                'period': f"{start_date} to {end_date}"
            }
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
        
        # Daily active users
        daily_users = sessions.values('login_at__date').annotate(
            unique_users=Count('user', distinct=True)
        ).order_by('login_at__date')
        
        # User behavior metrics
        behavior_metrics = UserBehaviorMetrics.objects.filter(
            last_updated__date__gte=start_date
        )
        
        # Calculate retention
        total_users = sessions.values('user').distinct().count()
        returning_users = behavior_metrics.filter(is_returning_user=True).count()
        retention_rate = (returning_users / total_users * 100) if total_users > 0 else 0
        
        return {
            'daily_users': list(daily_users),
            'summary': {
                'total_active_users': total_users,
                'returning_users': returning_users,
                'retention_rate': retention_rate,
                'avg_session_duration': sessions.aggregate(Avg('session_duration'))['session_duration__avg'],
                'period': f"{start_date} to {end_date}"
            }
        }
    
    def _get_anomaly_detection_data(self) -> Dict[str, Any]:
        """Get anomaly detection highlights"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)
        
        anomalies = AnomalyDetection.objects.filter(
            detected_at__gte=start_date,
            detected_at__lte=end_date
        ).order_by('-detected_at')
        
        # Group by type
        anomaly_summary = {}
        for anomaly in anomalies:
            anomaly_type = anomaly.anomaly_type
            if anomaly_type not in anomaly_summary:
                anomaly_summary[anomaly_type] = {
                    'count': 0,
                    'severity_high': 0,
                    'severity_medium': 0,
                    'severity_low': 0
                }
            
            anomaly_summary[anomaly_type]['count'] += 1
            if hasattr(anomaly, 'severity'):
                anomaly_summary[anomaly_type][f'severity_{anomaly.severity}'] += 1
        
        return {
            'anomalies': [{
                'type': a.anomaly_type,
                'detected_at': a.detected_at.isoformat(),
                'description': getattr(a, 'description', ''),
                'severity': getattr(a, 'severity', 'medium')
            } for a in anomalies],
            'summary': anomaly_summary,
            'period': f"{start_date.date()} to {end_date.date()}"
        }
    
    def _generate_pdf_report(self, report_type: str, data: Dict[str, Any], config: Dict[str, Any]) -> str:
        """Generate PDF report"""
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{report_type}_{timestamp}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#2E86AB')
        )
        
        title = self._get_report_title(report_type)
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 20))
        
        # Generate charts and add to story
        if report_type == 'daily_trading_volume':
            chart_path = self._create_volume_chart(data['daily_sales'])
            if chart_path:
                story.append(Image(chart_path, width=6*inch, height=4*inch))
                story.append(Spacer(1, 20))
        
        # Add summary table
        summary_table = self._create_summary_table(data['summary'])
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Add detailed data tables
        if report_type == 'daily_trading_volume' and 'top_collections' in data:
            collections_table = self._create_collections_table(data['top_collections'])
            story.append(Paragraph("Top Collections by Volume", styles['Heading2']))
            story.append(collections_table)
        
        doc.build(story)
        return filepath
    
    def _generate_csv_report(self, report_type: str, data: Dict[str, Any], config: Dict[str, Any]) -> str:
        """Generate CSV report"""
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{report_type}_{timestamp}.csv"
        filepath = os.path.join(self.output_dir, filename)
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            if report_type == 'daily_trading_volume':
                self._write_trading_volume_csv(csvfile, data)
            elif report_type == 'weekly_collection_performance':
                self._write_collection_performance_csv(csvfile, data)
            elif report_type == 'monthly_user_activity':
                self._write_user_activity_csv(csvfile, data)
            elif report_type == 'anomaly_detection_highlights':
                self._write_anomaly_detection_csv(csvfile, data)
        
        return filepath
    
    def _create_volume_chart(self, daily_sales: List[Dict]) -> Optional[str]:
        """Create volume chart for PDF"""
        if not daily_sales:
            return None
        
        try:
            dates = [item['date'] for item in daily_sales]
            volumes = [float(item['total_volume'] or 0) for item in daily_sales]
            
            plt.figure(figsize=(10, 6))
            plt.plot(dates, volumes, marker='o', linewidth=2, markersize=4)
            plt.title('Daily Trading Volume', fontsize=16, fontweight='bold')
            plt.xlabel('Date', fontsize=12)
            plt.ylabel('Volume (ETH)', fontsize=12)
            plt.xticks(rotation=45)
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            chart_path = os.path.join(self.output_dir, 'temp_volume_chart.png')
            plt.savefig(chart_path, dpi=300, bbox_inches='tight')
            plt.close()
            
            return chart_path
        except Exception as e:
            print(f"Error creating volume chart: {e}")
            return None
    
    def _create_summary_table(self, summary: Dict[str, Any]) -> Table:
        """Create summary table for PDF"""
        data = [['Metric', 'Value']]
        
        for key, value in summary.items():
            if key == 'period':
                data.append(['Period', str(value)])
            elif 'volume' in key.lower():
                data.append([key.replace('_', ' ').title(), f"{value:.4f} ETH"])
            elif 'rate' in key.lower():
                data.append([key.replace('_', ' ').title(), f"{value:.2f}%"])
            else:
                data.append([key.replace('_', ' ').title(), str(value)])
        
        table = Table(data)
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
        
        return table
    
    def _create_collections_table(self, collections: List[Dict]) -> Table:
        """Create collections table for PDF"""
        data = [['Contract Address', 'Volume (ETH)', 'Sales Count']]
        
        for collection in collections[:10]:  # Top 10
            data.append([
                collection['contract_address'][:20] + '...',
                f"{float(collection['total_volume']):.4f}",
                str(collection['total_sales'])
            ])
        
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        return table
    
    def _write_trading_volume_csv(self, csvfile, data: Dict[str, Any]):
        """Write trading volume data to CSV"""
        writer = csv.writer(csvfile)
        
        # Summary section
        writer.writerow(['SUMMARY'])
        for key, value in data['summary'].items():
            writer.writerow([key.replace('_', ' ').title(), value])
        writer.writerow([])  # Empty row
        
        # Daily sales data
        writer.writerow(['DAILY SALES DATA'])
        writer.writerow(['Date', 'Total Volume (ETH)', 'Total Sales', 'Average Price (ETH)'])
        
        for item in data['daily_sales']:
            writer.writerow([
                item['date'],
                item['total_volume'] or 0,
                item['total_sales'] or 0,
                item['avg_price'] or 0
            ])
        
        writer.writerow([])  # Empty row
        
        # Top collections
        if 'top_collections' in data:
            writer.writerow(['TOP COLLECTIONS'])
            writer.writerow(['Contract Address', 'Total Volume (ETH)', 'Total Sales'])
            
            for collection in data['top_collections']:
                writer.writerow([
                    collection['contract_address'],
                    collection['total_volume'] or 0,
                    collection['total_sales'] or 0
                ])
    
    def _write_collection_performance_csv(self, csvfile, data: Dict[str, Any]):
        """Write collection performance data to CSV"""
        writer = csv.writer(csvfile)
        
        # Summary
        writer.writerow(['SUMMARY'])
        for key, value in data['summary'].items():
            writer.writerow([key.replace('_', ' ').title(), value])
        writer.writerow([])  # Empty row
        
        # Collections data
        writer.writerow(['COLLECTION PERFORMANCE'])
        writer.writerow([
            'Collection Name', 'Total Volume (ETH)', 'Total Sales', 
            'Total Mints', 'Average Price (ETH)', 'Floor Price (ETH)', 'Ceiling Price (ETH)'
        ])
        
        for collection in data['collections']:
            writer.writerow([
                collection['name'],
                collection['total_volume'],
                collection['total_sales'],
                collection['total_mints'],
                collection['avg_price'],
                collection['floor_price'],
                collection['ceiling_price']
            ])
    
    def _write_user_activity_csv(self, csvfile, data: Dict[str, Any]):
        """Write user activity data to CSV"""
        writer = csv.writer(csvfile)
        
        # Summary
        writer.writerow(['SUMMARY'])
        for key, value in data['summary'].items():
            writer.writerow([key.replace('_', ' ').title(), value])
        writer.writerow([])  # Empty row
        
        # Daily users data
        writer.writerow(['DAILY ACTIVE USERS'])
        writer.writerow(['Date', 'Unique Users'])
        
        for item in data['daily_users']:
            writer.writerow([
                item['login_at__date'],
                item['unique_users']
            ])
    
    def _write_anomaly_detection_csv(self, csvfile, data: Dict[str, Any]):
        """Write anomaly detection data to CSV"""
        writer = csv.writer(csvfile)
        
        # Summary
        writer.writerow(['ANOMALY SUMMARY'])
        for anomaly_type, summary in data['summary'].items():
            writer.writerow([f"{anomaly_type} Count", summary['count']])
        writer.writerow([])  # Empty row
        
        # Detailed anomalies
        writer.writerow(['DETECTED ANOMALIES'])
        writer.writerow(['Type', 'Detected At', 'Description', 'Severity'])
        
        for anomaly in data['anomalies']:
            writer.writerow([
                anomaly['type'],
                anomaly['detected_at'],
                anomaly['description'],
                anomaly['severity']
            ])
    
    def _get_report_title(self, report_type: str) -> str:
        """Get formatted report title"""
        titles = {
            'daily_trading_volume': 'Daily Trading Volume Report',
            'weekly_collection_performance': 'Weekly Collection Performance Report',
            'monthly_user_activity': 'Monthly User Activity Report',
            'anomaly_detection_highlights': 'Anomaly Detection Highlights'
        }
        return titles.get(report_type, 'NFTopia Analytics Report')
    
    def _get_data_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Get summary of generated data"""
        summary = {
            'records_processed': 0,
            'data_points': 0
        }
        
        # Count data points
        for key, value in data.items():
            if isinstance(value, list):
                summary['data_points'] += len(value)
            elif isinstance(value, dict) and 'count' in str(value):
                summary['records_processed'] += 1
        
        return summary