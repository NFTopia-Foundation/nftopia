from drf_spectacular.utils import OpenApiExample

ANALYTICS_EXAMPLES = [
    OpenApiExample(
        'Successful query',
        value={
            "volume": "250.75",
            "transactions": 68,
            "average_price": "3.68"
        },
        status_codes=['200'],
        response_only=True
    ),
    OpenApiExample(
        'Collection not found',
        value={
            "error": "Collection 0x123... not found"
        },
        status_codes=['404'],
        response_only=True
    )
]