// Initialize global variables
var updateTimer;
var lastDataTimestamp = 0;

$(document).ready(function (){
  // Load data table when page loads
  loadData(true);
  // Set periodical updating
  updateTimer = setInterval("loadData()", 2000);
});

// Load data into container (if there is new data)
function loadData(first)
{
  var timestamp = (first === true) ? 0 : lastDataTimestamp;
  $.post('data.php', {"action":"get", "timestamp":timestamp}, dataLoaded);
}

// Handle the new data (if any) on a successful load
function dataLoaded(data)
{
  // Clear error box if needed
  $('#errorBox').html('&nbsp;');

  // Parse JSON (if needed)
  data = ($.parseJSON(data)) ? $.parseJSON(data) : data;

  if (data.status == 'success')
  {
    // Update data timestamp
    lastDataTimestamp = data.filetime;

    // Show when the data was last updated
    $('#lastCheck').html(data.datestamp);
    $('#lastChange').html(data.datestamp);
  
    // Put data into container
    $('#progressTableContainer').html(data.data);
  
    // Make table cells turn into input fields on click
    var cells = $('#progressTableContainer').find('td.value');
    cells.on('click', switchCellToInput);
  }
  else if (data.status == 'unchanged')
  {
    $('#lastCheck').html(data.datestamp );
  }
  else if (data.status == 'error')
  {
    $('#errorBox').html(data.data);
  }
}

// Switch one cell to an input field
function switchCellToInput(event)
{
  var cell = $(this);

  if (cell.find('input').length == 0)
  {
    // Get current cel value and turn it into an input field
    var value = parseInt(cell.html(), 10);
    var width = cell.width();
    cell.html('<input type="text" value="' + value + '" />');
    var input = cell.find('input');
    input.width(width - 4);
    cell.width(width);

    // Add handler to save data
    input.on('blur keypress', saveData);

    input.select();
  }
}

// Save changed data
function saveData(event)
{
  if (typeof event.keyCode == 'undefined' || event.keyCode == 13)
  {
    // Send new data to data handler
    //console.log(this, event);
    var input = $(this);
    var value = parseInt(input.val(), 10);
    var id = input.parent().attr('id').split('-');
    $.post('data.php', {"action":"set", "data":{"id":id, "value":value}}, dataSaved);

    // Update view back to normal
    input.parent().html(value);
  }
}

// Handle return value from data saving attempt
function dataSaved (data)
{
  if (data.status == 'success')
  {
    loadData();
  }
}
