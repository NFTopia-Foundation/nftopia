import pandas as pd

def time_buckets(df, freq='D', group_cols=None):
    """
    Create multi-index aggregations
    """
    df = df.set_index('timestamp')
    
    if not group_cols:
        return df.resample(freq).sum()
    
    return (
        df.groupby([pd.Grouper(freq=freq)] + group_cols)
        .sum()
        .unstack(group_cols)
    )