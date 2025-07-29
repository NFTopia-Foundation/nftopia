import pandas as pd

def rolling_volume(df, window='7D', value_col='amount'):
    """
    Calculate rolling volume metrics
    """
    return (
        df.set_index('timestamp')
        [value_col]
        .resample(window)
        .sum()
        .fillna(0)
    )

def exponential_moving_average(df, span=14, price_col='price'):
    """
    Calculate EMA for price trends
    """
    return (
        df.set_index('timestamp')
        [price_col]
        .ewm(span=span)
        .mean()
    )