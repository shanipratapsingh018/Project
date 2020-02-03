<?php 
require 'include/conn.php';

if (isset($_POST['signup'])) {
  $username=$_POST['username'];
  $email=$_POST['email'];
  $password=$_POST['password'];

  $sql = "SELECT id
  FROM members
  WHERE email='$email'";
  $result = $conn->query($sql);
  if ($result->num_rows > 0) { 
    echo "Email Already Exist";
  }
  else
  { 
    $sql = "INSERT INTO `members`(`username`, `email`, `password`) VALUES ('$username','$email','$password')";
  } 
  if ($conn->query($sql)) {
    echo "valid code";
  }
else
{
  echo "not valid";
}

}




?>

<!DOCTYPE html>
<html>
  <head>
    <title></title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="css/bootstrap.min.css">
    <script src="js/jquery.min.js"></script>
    <script src="js/1.14.7/umd/popper.min.js"></script>
    <script src="js/bootstrap.min.js"></script>
  </head>
  <body>
      <?php include 'include/header.php';?>
    <div class="container">

      <div class="row d-flex justify-content-center align-center">
        <div class="card" style="width: 400px">
          <div class="display-4 card-header">
            Signup
          </div>
          <div class="card-body">
            
            <form action="" method="POST" class="was-validated">
              <div class="form-group">
                <label for="uname">Username:</label>
                <input type="text" class="form-control" id="uname" placeholder="Enter username" name="username" required>
                <div class="valid-feedback">Valid.</div>
                <div class="invalid-feedback">Please fill out this field.</div>
              </div>
              <div class="form-group">
          <label for="email">E-mail:</label>
          <input type="text" class="form-control" id="email" placeholder="Enter email" name="email" required>
          <div class="valid-feedback">Valid.</div>
          <div class="invalid-feedback">Please fill out this field.</div>
        </div>
              <div class="form-group">
                <label for="pwd">Password:</label>
                <input type="password" class="form-control" id="pwd" placeholder="Enter password" name="password" required>
                <div class="valid-feedback">Valid.</div>
                <div class="invalid-feedback">Please fill out this field.</div>
              </div>
              <div class="form-group form-check">
                <label class="form-check-label">
                  <input class="form-check-input" type="checkbox" name="remember" required> I agree.
                  <div class="valid-feedback">Valid.</div>
                  <div class="invalid-feedback">Check this checkbox to continue.</div>
                </label>
              </div>
              <button type="submit" class="btn btn-primary" name="signup">Submit</button>
            </form>
          </div>
          
        </div>
        
      </div>
    </div>
    
    
  </div>
</body>
</html>