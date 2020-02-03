<!DOCTYPE html>
<html>
	<head>
		<title> My Wseb Site</title>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css">
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
		<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>
		
		<style>
		/* Make the image fully responsive */
		.carousel-inner img {
		width: 100%;
		height: 100%;
		
		}
		</style>
	</head>
	
	<body>
		
		
			
			<?php include 'include/header.php';?>
			
		
		<div class="main_area">
			<div id="demo" class="carousel slide container " data-ride="carousel">
				<!-- Indicators -->
				<ul class="carousel-indicators">
					<li data-target="#demo" data-slide-to="0" class="active"></li>
					<li data-target="#demo" data-slide-to="1"></li>
					<li data-target="#demo" data-slide-to="2"></li>
					<li data-target="#demo" data-slide-to="3"></li>
					<li data-target="#demo" data-slide-to="4"></li>
					<li data-target="#demo" data-slide-to="5"></li>
				</ul>
				
				<!-- The slideshow -->
				<div class="carousel-inner">
					<div class="carousel-item active">
						<img src="images/iot1.jpg" alt="Los Angeles" class="mx-auto d-block ">
					</div>
					<div class="carousel-item">
						<img src="images/iot2.jpg" alt="Chicago"  class="mx-auto d-block">
					</div>
					<div class="carousel-item">
						<img src="images/iot3.jpg" alt="New York"  class="mx-auto d-block">
					</div>
					<div class="carousel-item">
						<img src="images/iot4.jpg" alt="Chicago"  class="mx-auto d-block">
					</div>
					<div class="carousel-item">
						<img src="images/iot5.jpg" alt="Chicago"  class="mx-auto d-block">
					</div>
				</div>
				
				<!-- Left and right controls -->
				<a class="carousel-control-prev" href="#demo" data-slide="prev">
					<span class="carousel-control-prev-icon"></span>
				</a>
				<a class="carousel-control-next" href="#demo" data-slide="next">
					<span class="carousel-control-next-icon"></span>
				</a>
			</div>
			
			
		</div>
		<div class="footer">
			
			
		</div>
	</div>
</body>
</html>