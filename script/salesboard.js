// Initialize global variables
var updateTimer;
var lastDataTimestamp = 0;
var oldCellValue;

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
  //$('#errorBox').html('&nbsp;');

  // Parse JSON (if needed)
  data = ($.parseJSON(data)) ? $.parseJSON(data) : data;

  if (data.status == 'success')
  {
    // Update data timestamp
    lastDataTimestamp = data.filetime;

    // Show when the data was last updated
    $('#lastCheck').html(data.datestamp);
    $('#lastChange').html(data.filedate);
  
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
    message('error', data.data);
  }
  else
  {
    message('error', 'An unknown error occurred');
  }
}

// Switch one cell to an input field
function switchCellToInput(event)
{
  var cell = $(this);

  if (cell.find('input').length == 0)
  {
    // Get current cel value and turn it into an input field
    oldCellValue = parseInt(cell.html(), 10);
    var width = cell.width();
    cell.html('<input type="text" value="' + oldCellValue + '" />');
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
    // Get new data from cell
    //console.log(this, event);
    var input = $(this);
    var value = parseInt(input.val(), 10);

    // If data is valid number AND not the number it was before, send it to the data handler
    if (!isNaN(value) && value != oldCellValue)
    {
      var id = input.parent().attr('id').split('-');
      $.post('data.php', {"action":"set", "data":{"id":id, "value":value}}, dataSaved);
    }
    else
    {
      value = oldCellValue;
      message('error', 'Invalid input');
    }

    // Update view back to normal
    input.parent().html(value);
  }
}

// Handle return value from data saving attempt
function dataSaved (data)
{
  if (data.status == 'success')
  {
    message('success', data.data);
    loadData();
  }
  else if (data.status == 'error')
  {
    message('errors', data.data);
  }
  else
  {
    message('error', 'An unknown error occurred');
  }
}

function message(type, message)
{
  // For new messages: Fade out current message, change content, show new message , wait, fade out message
  // For repeated messages: Flash existing message
  if (type == 'error')
  {
    if ($('#errorBox').html() == message)
    {
      $('#errorBox').clearQueue().fadeOut(0).delay(200).fadeIn(0).delay(2000).fadeOut(1000);
    }
    else
    {
      $('#errorBox').fadeOut(1000).queue(function(){$(this).html(message);$(this).dequeue();}).fadeIn(0).delay(2000).fadeOut(1000);
    }
  }
  else if (type == 'success')
  {
    if ($('#successBox').html() == message)
    {
      $('#successBox').clearQueue().fadeOut(0).delay(200).fadeIn(0).delay(2000).fadeOut(1000);
    }
    else
    {
      $('#successBox').fadeOut(1000).queue(function(){$(this).html(message);$(this).dequeue();}).fadeIn(0).delay(2000).fadeOut(1000);
    }
  }
  else
  {
    message('error', 'Invalid message type');
  }
}
