from drf_spectacular.plumbing import build_bearer_security_scheme_object

def custom_preprocessing_hook(endpoints):
    bearer_security_scheme = build_bearer_security_scheme_object(
        header_name='Authorization',
        token_prefix='Bearer'
    )
    
    for endpoint in endpoints:
        if endpoint[0].startswith('/api/auth/'):
            endpoint[2]['auth'] = [bearer_security_scheme]
    
    return endpoints

SPECTACULAR_SETTINGS = {
    'PREPROCESSING_HOOKS': [
        'nftopia_analytics.schema.custom.custom_preprocessing_hook'
    ]
}