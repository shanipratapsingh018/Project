<?php
 if (session_status() == PHP_SESSION_NONE) {
    session_start();
}
?>

<style type="text/css">
		body{
			margin: 0;
		}
	.header{
		background: #999;
		height: 100px;
		margin: 15px;
	}
		.logo{
			height: 100px;
			float: left;
		}
		.logo img{
			height: 100px;
			padding: 5px;
		}
		.menu button{
			/*line-height: 50px;*/
			float: right;
			padding: 0 10px;
			margin: 5px;
			color: #fff;
			text-decoration-line: none;
			font-family: sans-serif;
			height: 50px;
			width: 100px;
		}
</style>
<div class="header sticky-top">
	
	
	<div class="logo">
		<img src="https://techachiever.com/techachiever/public/images/logo-2.png">
	</div>
	<div class="menu">
		<a href="contact.php"><button class="btn btn-primary" data-target="#login"><h4> contact</h4> </button></a>
		<?php
		if (!empty($_SESSION)) {
		?>
		<a href="logout.php"><button class="btn btn-primary"><h4> logout </h4></button></a>
		<a href="dashboard.php"><button class="btn btn-primary"> <h4> dash </h4></button></a>
		<?php
		}
		else
		{?>
		<a href="login.php"><button class="btn btn-primary"><h4> login </h4></button></a>
		<a href="signup.php"><button class="btn btn-primary"> <h4> signup </h4></button></a>
		<?php } ?>
		<a href="about.php"><button class="btn btn-primary"><h4> about </h4></button></a>
		<a href="index.php"><button class="btn btn-primary"> <h4>home </h4></button></a>
		
	</div>
</div>