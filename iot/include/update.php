<?php

require 'conn.php';
require 'session.php';

$sw=$_GET['sw'];

$sw_val= $_GET['sw_val'];



$sql = "UPDATE members SET $sw = '$sw_val'
	WHERE id='$id'" ;
$result=$conn->query($sql);
 

?>
