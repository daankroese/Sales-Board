// Initialize global variables
var sData           = '';
var oData           = {};
var container       = "#data";
var chart;
var updateTimer;
var chartData;
var chartDataHeader = [["Name", "Sales Calls", "Meetings", "New Customers", "Renewals", "Services", "Tools", "Total sales"]];
var summable        = ["Renewals", "Services", "Tools"];
var chartOptions    = {
  animation: {duration: 1000, easing: 'out'},
  chartArea: {left: 50, top: 50, width: "80%", height: "80%"},
  vAxis:     {baseline: 0, minValue: 0, maxValue: 1, format: "#%"}
}

// Load the Visualization API
google.load('visualization', '1.0', {'packages':['corechart']});

// Load first data when the Google Visualization API is loaded.
google.setOnLoadCallback(loadData);

function loadData()
{
  $.getJSON('data.json', initialize);
}

function initialize(data)
{
  // Initialize Google chart
  chart = new google.visualization.ColumnChart(document.getElementById('progressChart'));

  // Manipulate data and draw chart
  sData = JSON.stringify(data);
  transformData(data);
  drawChart();

  // Set periodical updating
  updateTimer = setInterval(function() { $.getJSON('data.json', updateView); }, 1000);
}

function transformData(data)
{
  // Initialize new data set
  chartData = chartDataHeader.slice();

  // Add sales persons to data array for chart
  var salesPerson = [];
  var summables = [0,0];
  $.each(data, function(salesPersonName, values) {
    salesPerson = [];
    summables = [0,0];

    // Sales person name
    salesPerson.push(salesPersonName);

    // Sales person status
    $.each(values, function(objective, status){
      salesPerson.push(status.status / status.target);
      if ($.inArray(objective, summable) > -1)
      {
        summables[0] += status.status;
        summables[1] += status.target;
      }
    });
    salesPerson.push(summables[0]/summables[1]);

    // Add sales person to array
    chartData.push(salesPerson);
  });

  // Transform chartData into data table
  chartData = google.visualization.arrayToDataTable(chartData);
}

function drawChart()
{
  chart.draw(chartData, chartOptions);
}

function updateView(data)
{
  // Has the data changed since the last update?
  sDataNew = JSON.stringify(data);
  if (sDataNew == sData)
  {
    return false;
  }

  sData = sDataNew;

  transformData(data);
  drawChart();
}