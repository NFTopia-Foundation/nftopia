document.getElementById('timeframe-selector').addEventListener('change', function() {
    const timeframe = this.value;
    
    fetch(`/admin/analyticsdashboard/metrics/?timeframe=${timeframe}`)
      .then(response => response.json())
      .then(data => {
        Plotly.react('mint-chart', [{
          x: data.mint.labels,
          y: data.mint.data,
          type: 'bar'
        }], {
          title: 'NFT Minting Volume'
        });
        
        // Update other charts similarly
      });
  });
  
  document.getElementById('export-btn').addEventListener('click', function() {
    const timeframe = document.getElementById('timeframe-selector').value;
    window.open(`/admin/analyticsdashboard/export/?timeframe=${timeframe}&format=csv`);
  });