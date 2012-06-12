<?php
/* Always return JSON */
header('Content-type: application/json');

/* Are we getting or setting data? */
$handler   = new Data();
$action    = $_POST['action'];
$timestamp = isset($_POST['timestamp']) ? intval($_POST['timestamp']) : false;
$data      = isset($_POST['data']) ? $_POST['data'] : false;

switch ($action)
{
  case 'get':
    if (!$handler->checkFileChanged($timestamp))
    {
      echo json_encode(array('status' => 'unchanged', 'datestamp' => date("Y-m-d H:i:s")));
    }
    else
    {
      echo $handler->get();
    }
    break;
  case 'set':
    echo $handler->set($data);
    break;
}

class Data {
  /* Initialize variables */
  var $filename = 'data/data.csv';
  var $fileModTime = false;
  var $csv_delim = ',';
  var $csv_enclo = '"';

  /* Data
   * Main function
   */
  function Data()
  {
    @ $this->fileModTime = filemtime($this->filename);
    if (!$this->fileModTime)
    {
      echo json_encode(array('status' => 'error', 'data' => 'Failed to get info on datafile ' . $this->filename));
      exit;
    }
  }

  /* checkFileChanged
   * Check whether the csv-file has been updated
   * since the last time it was requested.
   */
  function checkFileChanged($timestamp)
  {
    return ($this->fileModTime > $timestamp);
  }

  /* getData
   * Function for getting all the data from the
   * csv-file into an array.
   */
  function getData($filePointer)
  {
    // Get csv header row
    $header = fgetcsv($filePointer, 0, $this->csv_delim, $this->csv_enclo);

    // Get data for each salesperson
    $data = array();
    while ($row = fgetcsv($filePointer, 0, $this->csv_delim, $this->csv_enclo))
    {
      $data[] = $row;
    }

    return array('header' => $header, 'data' => $data);
  }

  /* setData
   * Function for getting all the data from the
   * csv-file into an array.
   */
  function setData($filePointer, $header, $data)
  {
    // Backup current csv file
    @ $backup = copy($this->filename, $this->filename . 'tmpbak');
    if (!$backup) return false;

    // Truncate csv file
    ftruncate($filePointer, 0);
    rewind($filePointer);

    // Set csv header row
    if (!fputcsv($filePointer, $header, $this->csv_delim, $this->csv_enclo))
    {
      unlink($this->filename);
      rename($this->filename . 'tmpbak', $this->filename);
      return false;
    }

    // Set data for each salesperson
    foreach ($data as $row)
    {
      if (!fputcsv($filePointer, $row, $this->csv_delim, $this->csv_enclo))
      {
        unlink($this->filename);
        rename($this->filename . 'tmpbak', $this->filename);
        return false;
      }
    }

    unlink($this->filename . 'tmpbak');
    return true;
  }

  /* get
   * Function for checking the csv-file for updates
   * and getting the most recent data returned as
   * html.
   */
  function get()
  {
    $totals = array();
    $grandTotals = array();
    $html = "<table>\n";

    // Open file pointer
    $fp = fopen($this->filename, "r");
    if ($fp)
    {
      // Get csv data
      $csv = $this->getData($fp);
      $header = $csv['header'];
      $data = $csv['data'];

      // Return error if data is missing
      if (empty($data))
      {
        return json_encode(array('status' => 'error', 'data' => 'No data found in ' . $this->filename));
      }

      // Create table from data
      // Create header
      $html .= "  <tr class=\"tableHeader\">\n"
             . "    <td>Sales Board</td>\n";
      for ($i = 0; $i < count($data); $i++)
      {
        $html .= "    <td colspan=\"2\" class=\"columnHeader\">" . $data[$i][0] . "</td>\n";
      }
      $html .= "    <td colspan=\"2\" class=\"columnHeader\">Total</td>\n  </tr>\n  <tr class=\"tableSubHeader\">\n    <td></td>\n";
      for ($i = 0; $i <= count($data); $i++)
      {
        $html .= "    <td>target</td><td>status</td>\n";
      }
      $html .= "  </tr>\n";
  
      // Create row for each sales type
      for ($i = 1; $i < count($header); $i++)
      {
        $rowClass  = ($i > 3) ? 'summable' : 'nonSummable';
        $cellClass = ($i > 3) ? 'money' : 'nonMoney';

        $html .= "  <tr class=\"$rowClass\">\n"
               . "    <td>" . $header[$i] . "</td>\n";
        for ($salesPerson = 0; $salesPerson < count($data); $salesPerson++)
        {
          $data[$salesPerson][$i] = explode(';', $data[$salesPerson][$i]);
          $html .= "    <td class=\"value target $cellClass\" id=\"dataCell-$salesPerson-$i-target\">" . $data[$salesPerson][$i][0] . "</td>\n"
                 . "    <td class=\"value status $cellClass\" id=\"dataCell-$salesPerson-$i-status\">" . $data[$salesPerson][$i][1] . "</td>\n";

          // Add data to grand total
          $grandTotals[$i][0] = (isset($grandTotals[$i][0])) ? $grandTotals[$i][0] + $data[$salesPerson][$i][0] : $data[$salesPerson][$i][0];
          $grandTotals[$i][1] = (isset($grandTotals[$i][1])) ? $grandTotals[$i][1] + $data[$salesPerson][$i][1] : $data[$salesPerson][$i][1];
          if ($i > 3)
          {
            $grandTotals['grandTotal'][0] = (isset($grandTotals['grandTotal'][0])) ? $grandTotals['grandTotal'][0] + $data[$salesPerson][$i][0] : $data[$salesPerson][$i][0];
            $grandTotals['grandTotal'][1] = (isset($grandTotals['grandTotal'][1])) ? $grandTotals['grandTotal'][1] + $data[$salesPerson][$i][1] : $data[$salesPerson][$i][1];
          }

          // Add sales to total for this sales person (only for 'Renewals', 'Services', and 'Tools')
          if ($i > 3)
          {
            $totals[$salesPerson][0] = (isset($totals[$salesPerson][0])) ? $totals[$salesPerson][0] + $data[$salesPerson][$i][0] : $data[$salesPerson][$i][0];
            $totals[$salesPerson][1] = (isset($totals[$salesPerson][1])) ? $totals[$salesPerson][1] + $data[$salesPerson][$i][1] : $data[$salesPerson][$i][1];
          }
        }

        // Add cells to totals column
        $html .= "    <td class=\"$cellClass\">" . $grandTotals[$i][0] . "</td>"
               . "    <td class=\"$cellClass emphasis\">" . $grandTotals[$i][1] . "</td>";

        $html .= "  </tr>\n";
      }

      // Create a row with totals
      $html .="  <tr class=\"tableTotals\">\n"
             . "    <td>Total sales</td>\n";
      for ($salesPerson = 0; $salesPerson < count($data); $salesPerson++)
      {
        $html .= "    <td class=\"target $cellClass\">" . $totals[$salesPerson][0] . "</td><td class=\"status emphasis $cellClass\">" . $totals[$salesPerson][1] . "</td>\n";
      }
      $html .= "    <td class=\"$cellClass\">" . $grandTotals['grandTotal'][0] . "</td>"
             . "    <td class=\"emphasis $cellClass\">" . $grandTotals['grandTotal'][1] . "</td>"
             . "  </tr>\n";

      // Return html
      $html .= "</table>\n";
      return json_encode(array('status' => 'success', 'filetime' => $this->fileModTime, 'filedate' => date("Y-m-d H:i:s", $this->fileModTime), 'datestamp' => date("Y-m-d H:i:s"), 'data' => $html));
    }
    else
    {
      return json_encode(array('status' => 'error', 'data' => 'Failed to open datafile ' . $this->filename));
    }
  }

  /* set
   * Function for saving new data to the csv-file.
   */
  function set($data)
  {
    // Open file pointer
    @ $fp = fopen($this->filename, "r+");
    if ($fp)
    {
      // Get csv data
      $csv = $this->getData($fp); 

      // Update the csv data with the new value
      $salesPerson = intval($data['id'][1]);
      $salesType   = intval($data['id'][2]);
      $newValue    = intval($data['value']);
      $update = explode(';', $csv['data'][$salesPerson][$salesType]);
      if ($data['id'][3] == 'target')
      {
        $update[0] = $newValue;
      }
      else
      {
        $update[1] = $newValue;
      }
      $csv['data'][$salesPerson][$salesType] = implode(';', $update);

      // Save the new csv date to file, update file modification time
      $success = $this->setData($fp, $csv['header'], $csv['data']);
      @ $this->fileModTime = filemtime($this->filename);
      if ($success)
      {
        return json_encode(array('status' => 'success', 'filetime' => $this->fileModTime, 'datestamp' => date("Y-m-d H:i:s"), 'data' => 'New csv data saved to file ' . $this->filename));
      }
      else
      {
        return json_encode(array('status' => 'error', 'data' => 'Failed to save new csv data to file ' . $this->filename));
      }
    }
    else
    {
      return json_encode(array('status' => 'error', 'data' => 'Failed to open datafile ' . $this->filename));
    }
  }
}
?>
