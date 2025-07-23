import plotly.graph_objects as go
from plotly.subplots import make_subplots

class PlotlyGenerator:
    @staticmethod
    def create_minting_trend_chart(dataframe, theme='dark'):
        fig = go.Figure()
        
        # Add traces
        fig.add_trace(
            go.Bar(
                x=dataframe['date'],
                y=dataframe['count'],
                name='Daily Mints',
                marker_color='#636EFA'
            )
        )
        
        fig.add_trace(
            go.Scatter(
                x=dataframe['date'],
                y=dataframe['rolling_avg'],
                name='3D Rolling Avg',
                line=dict(color='#FFA15A', width=2)
            )
        )
        
        # Layout configuration
        layout = {
            'title': 'NFT Minting Trends',
            'xaxis': {'title': 'Date'},
            'yaxis': {'title': 'Number of Mints'},
            'hovermode': 'x unified'
        }
        
        if theme == 'dark':
            layout.update({
                'plot_bgcolor': 'rgba(0,0,0,0)',
                'paper_bgcolor': 'rgba(0,0,0,0)',
                'font': {'color': 'white'},
                'xaxis': {'gridcolor': 'rgba(255,255,255,0.1)'},
                'yaxis': {'gridcolor': 'rgba(255,255,255,0.1)'}
            })
        
        return {
            'data': [trace.to_plotly_json() for trace in fig.data],
            'layout': layout,
            'config': {
                'responsive': True,
                'displayModeBar': True
            }
        }