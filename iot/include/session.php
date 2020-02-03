<?php
session_start();
require 'conn.php';
if (isset($_SESSION['id']) && isset($_SESSION['password'])) {
$id = $_SESSION['id'];
$password = $_SESSION['password'];
$sql = "SELECT * FROM members WHERE id = '$id' AND password = '$password'";
$result=$conn->query($sql);
#echo $result->num_rows;
if ($result->num_rows == 1) {
     $id = $_SESSION['id'];
     $username = $_SESSION['username'];
     $email = $_SESSION['email'];
     $password = $_SESSION['password'];
}
else
{
	header('location:logout.php');
	
}

}
else
{
header('location:logout.php');
	
}
?>
