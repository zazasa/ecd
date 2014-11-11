<?php
include 'config.php';
if(!isset($_GET["format"])) $format = "json";
    else $format = $_GET["format"];
if(!isset($_GET["start"])) $from = 0;
    else $from = $_GET["start"];
if(!isset($_GET["length"])) $size = 100;
    else $size = $_GET["length"];
if(!isset($_GET["order"])) $order = "";
    else $order = $_GET["order"];
if(!isset($_GET["search"])) $search = "";
    else $search = $_GET["search"];

$index = "_river"; 

$sort = array();
foreach($order as $item){
    $field = $_GET["columns"][ $item["column"] ][ "data" ];
    array_push( $sort, array( $field => array( "order" => $item["dir"])   ));
}

$query = "runrivertable";

$stringQuery = file_get_contents("../json/".$query.".json");
$jsonQuery = json_decode($stringQuery,true);

$jsonQuery["size"] = $size;
$jsonQuery["from"] = $from;
$jsonQuery["sort"] = $sort;
if ($search["value"] != "" ){
    $jsonQuery["filter"]["query"]["query_string"]["query"] = "*".$search["value"]."*";    
}

$stringQuery = json_encode($jsonQuery);
//var_dump($stringQuery);

$res=json_decode(esQuery($stringQuery,$index), true);

$ret = array();
foreach ($res["hits"]["hits"] as $item) {
    array_push($ret, $item["_source"]);
}
$total = ceil($res["aggregations"]["total"]["value"]/2);
$filteredTotal = $total;

$aaData = array();
$hits = $res["aggregations"]["type"]["buckets"];
foreach ($hits as $hit) {
    $name = $hit["key"];
    $role = $hit["role"]["buckets"][0]["key"];
    if ($role == null){ $role = "main"; }
    $ip = $hit["server"]["buckets"][0]["key"];
    $host = gethostbyaddr($ip);
    $data = array("name" => $name, "role"=> $role, "host" => $host);
    $aaData[] = $data;   
}

//Output
$output = array(
    "sEcho" => intval($_GET['sEcho']),
    "iTotalRecords" => $total,
    "iTotalDisplayRecords" => $filteredTotal,
    "aaData" => $aaData
);

echo json_encode( $output );
?>