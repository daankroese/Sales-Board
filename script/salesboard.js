// Initialize global variables
var updateTimer;
var lastDataTimestamp = 0;
var oldCellValue;
var dataHandler = 'data/data.php';
var baseFontSize;

$(document).ready(function (){
  // Load data table when page loads
  loadData(true);

  // Set periodical updating
  updateTimer = setInterval("loadData()", 2000);

  // Set base font size (used for automatic scaling) and scaling on window resize
  baseFontSize = $('body').css('font-size');
  $(window).bind('resize', scaleToFit);
});

// Load data into container (if there is new data)
function loadData(first)
{
  var timestamp = (first === true) ? 0 : lastDataTimestamp;
  $.post(dataHandler, {"action":"get", "timestamp":timestamp}, dataLoaded);
}

// Handle the new data (if any) on a successful load
function dataLoaded(data)
{
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
    $('#dataTableContainer').html(data.data);

    // Format the cells with money data accordingly
    var moneyCells = $('#dataTableContainer').find('td.money');
    $.each(moneyCells, function(index, cell) {
      cell = $(cell);
      cell.html(cell.html().toInt().toMoney());
    });

    // Make table cells turn into input fields on click
    var editableCells = $('#dataTableContainer').find('td.value');
    editableCells.on('click', switchCellToInput);

    // Scale new data to fit in browser window
    scaleToFit();

    message('success', 'New data loaded');
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

// Scale the data to prevent scrolling
function scaleToFit()
{
  // Reset to default base font size
  $('body').css('font-size', baseFontSize);

  // Reduce base font size until content fits in browser window
  var currentFontSize = parseInt($('body').css('font-size'), 10);
  while (   $(document).width()     > $(window).width()
         || $(document).height()    > $(window).height()
         || $('#dataTable').width() > $('#dataTableContainer').width()
        )
  {
    $('body').css('font-size', --currentFontSize + 'px');

    // Safety to prevent infinite loop
    if (currentFontSize <= 1)
    {
      $('body').css('font-size', baseFontSize);
      message('error', 'Content could not be scaled to fit inside window');
      break;
    }
  }
}

// Switch one cell to an input field
function switchCellToInput(event)
{
  var cell = $(this);

  if (cell.find('input').length == 0)
  {
    // Get current cel value and turn it into an input field
    oldCellValue = cell.html().toInt();
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
    var value = input.val().toInt();

    // If data is valid number AND not the number it was before, send it to the data handler
    if (isNaN(value))
    {
      value = oldCellValue;
      message('error', 'Invalid input');
    }
    else if (value == oldCellValue)
    {
      value = oldCellValue;
      message('error', 'Field value unchanged');
    }
    else
    {
      var id = input.parent().attr('id').split('-');
      $.post(dataHandler, {"action":"set", "data":{"id":id, "value":value}}, dataSaved);
    }

    // Update view back to normal
    value = (input.parent().hasClass('money')) ? value.toMoney() : value;
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
    message('error', data.data);
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
    this.message('error', 'Invalid message type');
  }
}

/**
 * Number Formatting Magic™
 *
 * Format a number as money
 * source: http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript
 */
Number.prototype.toMoney = function(decimals, decimal_sep, thousands_sep)
{ 
   var n = this,
   c = isNaN(decimals) ? 0 : Math.abs(decimals),
   d = decimal_sep || ',',
   // If you don't want to use a thousands separator you can pass an empty string for thousands_sep
   t = (typeof thousands_sep === 'undefined') ? '.' : thousands_sep,
   sign = (n < 0) ? '-' : '',
   // Extract the absolute value of the integer part of the number and convert to string
   i = parseInt(n = Math.abs(n).toFixed(c)) + '',
   j = ((j = i.length) > 3) ? j % 3 : 0;
   return sign + (j ? i.substr(0, j) + t : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : '');
}
/**
 * Strip all non-numeric characters from string and return integer value
 */
String.prototype.toInt = function(decimal_sep)
{
  var regex = (typeof decimal_sep == 'undefined' || decimal_sep == ',') ? /[^0-9,]/g : /[^0-9\.]/g;
  return parseInt(this.replace(regex, ''), 10);
}