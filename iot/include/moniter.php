<?php
require 'conn.php';
require 'session.php';
$result = $conn->query("SELECT  `sw1`, `sw2`, `sw3`, `sensor` FROM `members` WHERE id =$id");
$row_data=$result->fetch_assoc();

if ($row_data['sw1']=='1') {
	# code...
	$sw1='on';
}
else
{
	$sw1='off';
}
if ($row_data['sw2']=='1') {
	# code...
	$sw2='on';
}
else
{
	$sw2='off';
}
if ($row_data['sw3']=='1') {
	# code...
	$sw3='on';
}
else
{
	$sw3='off';
}

?>


<div class="row">
	<div class="col-sm-12 ">
		<div class="card mt-4 ">
			
			<span class="display-4"> Luminance : <?php echo $row_data['sensor'] ?> %
				
			</span>
		</div>
	</div>
	<div class="col-sm-4 ">
		<div class="card mt-4">
			<div class="card-header">Switch-1</div>
			<div class="card-body">
				<span class="display-4"> <?php echo $sw1 ?> </span>
				<div>
					<button class="btn btn-danger sw1" value="1">Turn-On</button>
					<button class="btn btn-warning sw1" value="0">Turn-Off</button>
				</div>
			</div>
		</div>
	</div>
	<div class="col-sm-4 ">
		<div class="card mt-4">
			<div class="card-header">Switch-2</div>
			<div class="card-body">
				<span class="display-4"> <?php echo $sw2 ?></span>
				<div>
					<button class="btn btn-primary sw2" value="1">Turn-On</button>
					<button class="btn btn-success sw2" value="0">Turn-Off</button>
				</div>
			</div>
		</div>
	</div>
	<div class="col-sm-4 ">
		<div class="card mt-4">
			<div class="card-header">Switch-3</div>
			<div class="card-body">
				<span class="display-4"> <?php echo $sw3 ?></span>
				<div>
					<button class="btn btn-dark  sw3"  value="1">Turn-On</button>
					<button class="btn btn-warning sw3" value="0">Turn-Off</button>
				</div>
			</div>
		</div>
	</div>
</div>
<script type="text/javascript">
	var sw_val = 0;
	var sw = null;
	$(".sw1").click(function() {
		sw = 'sw1';
	    sw_val=$(this).val();
	    update(sw,sw_val);
	});
	$(".sw2").click(function() {
		sw = 'sw2';
	    sw_val=$(this).val();
	    update(sw,sw_val);
	});
	$(".sw3").click(function() {
		sw = 'sw3';
	    sw_val=$(this).val();
	    update(sw,sw_val);
	});
</script>