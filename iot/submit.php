<?php
require 'include/conn.php';
if (isset($_POST['Login'])) {
$email=$_POST['email'];
$password=$_POST['password'];
$sql= "SELECT * FROM members
WHERE email='$email' AND password ='$password'";
$result = $conn->query($sql);
if ($result->num_rows) {
  $rowdata = $result->fetch_assoc();
echo $rowdata['username']."<br>";
echo $rowdata['city'] ."<br>";

echo $rowdata['email']."<br>";
echo  $rowdata['password']."<br>";
  # code...
}

}
?>
<!DOCTYPE html>
<html>
<head>
	<title></title>
</head>
<body>

</body>

