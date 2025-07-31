# analytics/utils/visualization_utils.py
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import plotly.express as px
from typing import List, Optional

def generate_volume_chart(dates: List[str], values: List[float], currency: str = 'ETH') -> dict:
    """
    Generate trading volume area chart
    Args:
        dates: List of ISO format date strings
        values: List of trading volume values
        currency: Currency symbol for display
    Returns:
        Plotly figure configuration as dict
    """
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=dates,
        y=values,
        fill='tozeroy',
        mode='lines',
        line=dict(width=0.5, color='#636EFA'),
        fillcolor='rgba(99, 110, 250, 0.2)',
        name=f'Volume ({currency})',
        hovertemplate='%{x|%b %d}<br>%{y:.2f} ' + currency + '<extra></extra>'
    ))
    fig.update_layout(
        title='Trading Volume',
        xaxis_title='Date',
        yaxis_title=f'Volume ({currency})',
        hovermode='x unified',
        yaxis=dict(
            tickprefix=currency + ' ',
            gridcolor='rgba(0,0,0,0.1)'
        )
    )
    return fig.to_dict()

def generate_floor_price_chart(dates: List[str], prices: List[float], currency: str = 'ETH') -> dict:
    """
    Generate floor price trend chart with annotations
    Args:
        dates: List of ISO format date strings
        prices: List of floor price values
        currency: Currency symbol for display
    Returns:
        Plotly figure configuration as dict
    """
    fig = go.Figure()
    
    # Main price line
    fig.add_trace(go.Scatter(
        x=dates,
        y=prices,
        mode='lines+markers',
        name='Floor Price',
        line=dict(color='#00CC96', width=2.5),
        marker=dict(size=8, color='#00CC96'),
        hovertemplate='%{x|%b %d}<br>%{y:.2f} ' + currency + '<extra></extra>'
    ))
    
    # Add percentage change if sufficient data
    if len(prices) > 1:
        price_change = ((prices[-1] - prices[0]) / prices[0]) * 100
        fig.add_annotation(
            x=dates[-1],
            y=prices[-1],
            text=f'{price_change:+.1f}%',
            showarrow=True,
            arrowhead=1,
            ax=0,
            ay=-40,
            bgcolor='white',
            bordercolor='#00CC96'
        )
    
    fig.update_layout(
        title='Floor Price Trend',
        xaxis_title='Date',
        yaxis_title=f'Price ({currency})',
        hovermode='x unified',
        yaxis=dict(
            tickprefix=currency + ' ',
            gridcolor='rgba(0,0,0,0.1)'
        )
    )
    return fig.to_dict()



def generate_minting_chart(dates: List[str], counts: List[int]) -> dict:
    """
    Generate minting activity bar chart with moving average
    Args:
        dates: List of ISO format date strings
        counts: List of daily mint counts
    Returns:
        Plotly figure configuration as dict
    """
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    
    # Bar chart for raw counts
    fig.add_trace(go.Bar(
        x=dates,
        y=counts,
        name='Daily Mints',
        marker_color='#00CC96',
        opacity=0.6,
        hovertemplate='%{x|%b %d}<br>%{y} mints<extra></extra>'
    ), secondary_y=False)
    
    # Add moving average if sufficient data
    if len(counts) > 7:
        rolling_avg = pd.Series(counts).rolling(7).mean()
        fig.add_trace(go.Scatter(
            x=dates,
            y=rolling_avg,
            name='7D Avg',
            line=dict(color='#FFA15A', width=2),
            hovertemplate='7D Avg: %{y:.1f}<extra></extra>'
        ), secondary_y=True)
    
    fig.update_layout(
        title='Minting Activity',
        xaxis_title='Date',
        yaxis_title='Mint Count',
        hovermode='x unified'
    )
    return fig.to_dict()


def generate_holders_chart(
    addresses: List[str], 
    counts: List[int], 
    top_n: int = 10,
    currency: Optional[str] = None
) -> dict:
    """
    Generate holder distribution chart
    Args:
        addresses: List of holder addresses
        counts: List of NFT counts per holder
        top_n: Number of top holders to display
        currency: Optional currency symbol for tooltips
    Returns:
        Plotly figure configuration as dict
    """
    # Prepare shortened labels and handle "others"
    short_addresses = [f"{addr[:6]}...{addr[-4:]}" for addr in addresses[:top_n]]
    other_count = sum(counts[top_n:]) if len(counts) > top_n else 0
    
    if other_count > 0:
        short_addresses.append('Other Holders')
        counts = counts[:top_n] + [other_count]
    
    # Generate hover text with full address if needed
    hover_text = [f"Full: {addr}" for addr in addresses[:top_n]]
    if other_count > 0:
        hover_text.append(f"Combined {len(addresses) - top_n} holders")
    
    fig = go.Figure()
    fig.add_trace(go.Pie(
        labels=short_addresses,
        values=counts,
        hole=0.4,
        textinfo='percent+label',
        insidetextorientation='radial',
        hovertext=hover_text,
        hovertemplate=(
            "<b>%{label}</b><br>"
            "Share: %{percent:.1%}<br>"
            f"Tokens: %{{value}}{' ' + currency if currency else ''}<br>"
            "%{hovertext}<extra></extra>"
        ),
        marker_colors=px.colors.qualitative.Plotly
    ))
    
    fig.update_layout(
        title=f'Top {min(top_n, len(addresses))} Holders',
        uniformtext_minsize=12,
        uniformtext_mode='hide'
    )
    return fig.to_dict()
