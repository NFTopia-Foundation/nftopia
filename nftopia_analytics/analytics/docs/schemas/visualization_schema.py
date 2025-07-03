from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

minting_trend_schema = {
    'get': extend_schema(
        description="Get minting trend visualization data",
        parameters=[
            OpenApiParameter(
                name='timeframe',
                description='Time period for analysis',
                required=False,
                type=str,
                enum=['24h', '7d', '30d']
            ),
            OpenApiParameter(
                name='theme',
                description='Color theme for visualization',
                required=False,
                type=str,
                enum=['dark', 'light']
            ),
            OpenApiParameter(
                name='refresh',
                description='Force refresh cached data',
                required=False,
                type=bool
            )
        ],
        examples=[
            OpenApiExample(
        '24-hour Minting Trend (Dark Theme)',
        value={
            "data": [
                {
                    "x": ["2023-10-01 00:00", "2023-10-01 12:00", "2023-10-02 00:00"],
                    "y": [15, 32, 27],
                    "type": "bar",
                    "name": "Hourly Mints",
                    "marker": {"color": "#636EFA"}
                },
                {
                    "x": ["2023-10-01 00:00", "2023-10-01 12:00", "2023-10-02 00:00"],
                    "y": [18, 24, 26],
                    "type": "scatter",
                    "name": "3h Rolling Avg",
                    "line": {"color": "#FFA15A", "width": 2}
                }
            ],
            "layout": {
                "title": "NFT Minting Trends (24h)",
                "plot_bgcolor": "rgba(0,0,0,0)",
                "paper_bgcolor": "rgba(0,0,0,0)",
                "font": {"color": "white"},
                "xaxis": {
                    "title": "Time",
                    "gridcolor": "rgba(255,255,255,0.1)"
                },
                "yaxis": {
                    "title": "Mints",
                    "gridcolor": "rgba(255,255,255,0.1)"
                }
            },
            "config": {
                "responsive": True,
                "displayModeBar": True
            }
        },
        status_codes=['200'],
        response_only=True
    ),
    OpenApiExample(
        '7-day Minting Trend (Light Theme)',
        value={
            "data": [
                {
                    "x": ["2023-09-25", "2023-09-26", "2023-09-27", "2023-09-28"],
                    "y": [120, 145, 132, 168],
                    "type": "bar",
                    "name": "Daily Mints",
                    "marker": {"color": "#1F77B4"}
                }
            ],
            "layout": {
                "title": "Weekly Minting Volume",
                "plot_bgcolor": "rgba(255,255,255,1)",
                "paper_bgcolor": "rgba(255,255,255,1)",
                "font": {"color": "#2a3f5f"},
                "xaxis": {"title": "Date"},
                "yaxis": {"title": "Total Mints"}
            },
            "config": {
                "displaylogo": False
            }
        },
        status_codes=['200'],
        response_only=True
    )
        ]
    )
}