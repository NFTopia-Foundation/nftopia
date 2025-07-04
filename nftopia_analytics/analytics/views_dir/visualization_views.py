from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..serializers.visualization_serializers import TimeframeSerializer
from ..services.data_processor import DataProcessor
from ..services.plotly_generator import PlotlyGenerator
from docs.schemas.visualization_schema import minting_trend_schema


class MintingTrendVisualization(APIView):
    @extend_schema(**minting_trend_schema)
    def get(self, request):
        serializer = TimeframeSerializer(data=request.query_params)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        timeframe = serializer.validated_data['timeframe']
        theme = serializer.validated_data['theme']
        
        if serializer.validated_data['refresh']:
            cache.delete(f"viz-raw:{timeframe}:minting")
        
        df = DataProcessor.get_minting_trends(timeframe)
        visualization = PlotlyGenerator.create_minting_trend_chart(df, theme)
        
        return Response(visualization)
    
