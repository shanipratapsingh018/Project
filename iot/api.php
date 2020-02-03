<?php
require 'include/conn.php';
$id = $_GET['id'];
$sensor=$_GET['sensor'];
$sql="UPDATE members SET sensor='$sensor' WHERE id='$id'";
$conn->query($sql);
$sql="SELECT  `sw1`, `sw2`, `sw3`, `sensor` FROM `members` WHERE `id`='$id'";
$result = $conn->query($sql);
$row_data=$result->fetch_assoc();
echo $row_data['sw1'];
echo $row_data['sw2'];
echo $row_data['sw3'];

?>