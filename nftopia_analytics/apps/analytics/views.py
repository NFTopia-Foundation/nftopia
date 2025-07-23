from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import (
    extend_schema,
    OpenApiParameter,
    OpenApiExample,
    OpenApiResponse
)
from .serializers import AnalyticsResponseSerializer

class AnalyticsView(APIView):
    """
    API endpoint for retrieving NFT collection analytics
    """
    
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='collection_address',
                description='Contract address of the NFT collection',
                required=True,
                type=str,
                location=OpenApiParameter.QUERY,
                examples=[
                    OpenApiExample(
                        'Example',
                        value='0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d'  # BAYC address
                    )
                ]
            ),
            OpenApiParameter(
                name='timeframe',
                description='Time period for analytics',
                required=False,
                type=str,
                enum=['24H', '7D', '30D', 'ALL'],
                default='7D',
                location=OpenApiParameter.QUERY
            )
        ],
        responses={
            200: OpenApiResponse(
                response=AnalyticsResponseSerializer,
                description='Successful response',
                examples=[
                    OpenApiExample(
                        'Bored Ape Yacht Club Example',
                        value={
                            "total_volume": "1245.75",
                            "transaction_count": 342,
                            "average_price": "3.642",
                            "floor_price": "32.50",
                            "timeframe": "7D",
                            "collection_address": "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
                            "last_updated": "2023-11-20T14:30:00Z"
                        }
                    )
                ]
            ),
            400: OpenApiResponse(
                description='Invalid input',
                examples=[
                    OpenApiExample(
                        'Invalid Address',
                        value={
                            "error": "Invalid Ethereum address",
                            "code": "invalid_address"
                        }
                    )
                ]
            ),
            404: OpenApiResponse(
                description='Collection not found',
                examples=[
                    OpenApiExample(
                        'Not Found',
                        value={
                            "error": "Collection not indexed",
                            "code": "not_found"
                        }
                    )
                ]
            )
        },
        auth=['JWT'],
        tags=['Analytics']
    )
    def get(self, request):
        """
        Retrieve trading analytics for a specific NFT collection
        
        Returns volume, transaction count, average price and other metrics
        for the specified time period.
        """
        # Extract and validate query params
        collection_address = request.query_params.get('collection_address')
        timeframe = request.query_params.get('timeframe', '7D')
        
        if not self._validate_eth_address(collection_address):
            return Response(
                {"error": "Invalid Ethereum address"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get data from your service layer
        try:
            analytics_data = self._get_analytics_data(collection_address, timeframe)
        except CollectionNotFound:
            return Response(
                {"error": "Collection not indexed"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize and return response
        serializer = AnalyticsResponseSerializer(data=analytics_data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)

    def _validate_eth_address(self, address):
        """Basic Ethereum address validation"""
        import re
        return re.match(r'^0x[a-fA-F0-9]{40}$', address) if address else False

    def _get_analytics_data(self, collection_address, timeframe):
        """Replace with your actual data fetching logic"""
        # Example implementation:
        from datetime import datetime, timezone
        return {
            "total_volume": "1245.75",  # Replace with real calculation
            "transaction_count": 342,     # From your database/analytics
            "average_price": "3.642",     # Calculated metric
            "floor_price": "32.50",       # Optional field
            "timeframe": timeframe,
            "collection_address": collection_address,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }