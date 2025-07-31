from django_pandas.io import read_frame
from analytics.models import NFTEvent
import pandas as pd

def queryset_to_dataframe(qs, field_map=None):
    """
    Optimized DataFrame conversion with type preservation
    """
    df = read_frame(qs, 
                   fieldnames=field_map,
                   verbose=False,
                   index_col='id')
    
    # Type preservation
    for col in df.select_dtypes(include=['object']):
        if col.endswith('_at') or col == 'timestamp':
            df[col] = pd.to_datetime(df[col])
        elif col.endswith('_amount') or col.endswith('_price'):
            df[col] = pd.to_numeric(df[col])
    
    return df