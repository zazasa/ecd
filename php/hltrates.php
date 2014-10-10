<?php 
include 'configTribe.php';

if(!isset($_GET["format"])) $format = "json";
    else $format = $_GET["format"];
if(!isset($_GET["runNumber"])) $runNumber = 111003;
    else $runNumber = $_GET["runNumber"];
if(!isset($_GET["numVal"])) $numVal = 50;
    else $numVal = $_GET["numVal"];
if(!isset($_GET["timePerLs"])) $timePerLs = 24.3;
    else $timePerLs = $_GET["timePerLs"];     



//get legend
$index = "run".$runNumber."*/hltrates-legend"; 
$stringQuery = '{"size":1}';
$res=json_decode(esQuery($stringQuery,$index), true);
$pathNames = $res["hits"]["hits"][0]["_source"]["path-names"];
$datasetNames = $res["hits"]["hits"][0]["_source"]["dataset-names"];


//get last ls
$index = "run".$runNumber."*/hltrates"; 
$stringQuery = '{"size":1,"sort":[{"ls":{"order":"desc"}}]}';
$res=json_decode(esQuery($stringQuery,$index), true);
$lastLs = $res["hits"]["hits"][0]["_source"]["ls"];
$from = $lastLs - $numVal;

//get rates
$query = "hltrates.json";
$index = "run".$runNumber."*/hltrates"; 
$stringQuery = file_get_contents("../json/".$query);
$jsonQuery = json_decode($stringQuery,true);
$jsonQuery["query"]["range"]["ls"]["from"]= $from;
$stringQuery = json_encode($jsonQuery);
$res=json_decode(esQuery($stringQuery,$index), true);

$dataAccepted = array();
$dataProcessed = array();

$hits = &$res["hits"]["hits"];

foreach ($hits as $hit ) {
    $ls = $hit["_source"]["ls"];
    $processed = $hit["_source"]["processed"];
    $dataList = $hit["_source"];
    
    if ( !array_key_exists( $ls , $dataProcessed )){ $dataProcessed[$ls] = 0; }
    $dataProcessed[$ls] += $processed;


    foreach ($dataList as $dataName => $data) {

    
        if (startsWith($dataName,"dataset")){ $names = $datasetNames;}
        elseif (startsWith($dataName,"path")){$names = $pathNames; }       
        else {continue;}        
    
        //var_dump($dataName);

    
    //    $pathAccepted = $hit["_source"]["path-accepted"];
    //    $pathRejected = $hit["_source"]["path-rejected"];
    //    $pathWasRun = $hit["_source"]["path-wasrun"];
    //    $pathErrors = $hit["_source"]["path-errors"];
    //    $pathAfterPrescale = $hit["_source"]["path-afterprescale"];
    //    $pathAfterL1Seed = $hit["_source"]["path-afterl1seed"];
    //
    //    $datasetAccepted = $hit["_source"]["dataset-accepted"];
    
        if (!array_key_exists($dataName, $dataAccepted)){ $dataAccepted[$dataName] = array();}
        

        $i=0;
        foreach ($data as $accepted) {
            $name = $names[$i];
            //var_dump($ls,$name);
            $i++;
            
            if (!array_key_exists($name, $dataAccepted[$dataName])){
                $dataAccepted[$dataName][$name] = array();
            }
            if (!array_key_exists($ls, $dataAccepted[$dataName][$name])){
                $dataAccepted[$dataName][$name][$ls] = 0;
            }
            //var_dump($dataAccepted);
            $dataAccepted[$dataName][$name][$ls] += $accepted;
        }
    }
}

//if ($format=="json"){ echo json_encode($dataAccepted); }


unset($res);
unset($hits);

$out = array();

//foreach ( $dataProcessed as $ls => $value ) {
//    $rate = round($value/$timePerLs,2);
//    $outData[] = array($ls,$rate);
//}
//$out[] = array("name"=>"processed","data"=> $outData);


foreach ( $dataAccepted as $dataName => $data ) {
    foreach ( $data as $pathName => $data ) {
       $outData = array();
       foreach ( $data as $ls => $value ) {
           $rate = round($value/$timePerLs,2);
           $outData[] = array($ls,$rate);
       }
       $out[$dataName][] = array("name"=>$pathName,"data"=> $outData);
   }
}

if ($format=="json"){ echo json_encode($out); }
?>