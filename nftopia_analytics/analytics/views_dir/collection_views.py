from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
import csv
from ..services.collection_service import CollectionAnalytics
from ..utils_dir.visualization_utils import (
    generate_volume_chart,
    generate_minting_chart,
    generate_holders_chart,
    generate_floor_price_chart
)

class BaseCollectionView(APIView):
    """Base view with common CSV export functionality"""
    csv_headers = None
    data_keys = None
    visualization_fn = None
    
    def get_csv_response(self, data):
        response = HttpResponse(content_type='text/csv')
        writer = csv.writer(response)
        writer.writerow(self.csv_headers)
        
        # Get data columns in same order as headers
        data_columns = [data[key] for key in self.data_keys]
        
        for row in zip(*data_columns):
            writer.writerow(row)
        return response
    
    def get_visualization(self, data):
        return self.visualization_fn(data) if self.visualization_fn else None
    
    def format_response(self, data):
        if self.request.GET.get('format') == 'csv':
            return self.get_csv_response(data)
            
        response_data = {'data': data}
        if viz := self.get_visualization(data):
            response_data['visualization'] = viz
        return Response(response_data)

class CollectionMetricsView(BaseCollectionView):
    csv_headers = ['Date', 'Floor Price', 'Volume']
    data_keys = ['timestamps', 'floor_price', 'volume']
    visualization_fn = lambda self, data: {
        'volume': generate_volume_chart(data['timestamps'], data['volume']),
        'floor_price': generate_floor_price_chart(data['timestamps'], data['floor_price'])
    }
    
    def get(self, request, collection_id):
        data = CollectionAnalytics.get_core_metrics(collection_id)
        return self.format_response(data)

class CollectionMintingView(BaseCollectionView):
    csv_headers = ['Date', 'Mint Count', 'Unique Minters']
    data_keys = ['timestamps', 'mint_count', 'unique_minters']
    visualization_fn = lambda self, data: {
        'minting': generate_minting_chart(data['timestamps'], data['mint_count'])
    }
    
    def get(self, request, collection_id):
        data = CollectionAnalytics.get_minting_metrics(collection_id)
        return self.format_response(data)

class CollectionHoldersView(BaseCollectionView):
    csv_headers = ['Holder Address', 'NFT Count', 'Percentage']
    data_keys = ['addresses', 'counts', 'percentages']
    visualization_fn = lambda self, data: {
        'holders': generate_holders_chart(data['addresses'], data['counts'])
    }
    
    def get(self, request, collection_id):
        data = CollectionAnalytics.get_holder_distribution(collection_id)
        return self.format_response(data)
