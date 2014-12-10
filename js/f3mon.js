var selectedRun;
var selectedIndex;

var runInfo = {
    runNumber : false,
    startTime : false,
    endTime : false,
    lastLs : false,
    streams : false,
    status : "NORUN", //NORUN,LIVE,CLOSED 
    sysName: DEFAULTINDEX,
    indexList: false,
    indexName: false,
    
    timer : new Timer(),
    interval : 5000,
    running: true,
    

    start : function(){ this.running = true; this.run(); },
    stop : function(){ 
        this.timer.stop(); 
        this.running = false; this.runNumber = false; this.startTime = false; this.endTime = false; this.lastLs = false;
        this.streams = false; this.status = false;
    },
    run : function(){
        if(riverStatus.collector.status){$("#runCollecting").fadeToggle(Math.round(runInfo.interval/2))}
            else {$("#runCollecting").fadeOut(Math.round(runInfo.interval/2))}
        if (!this.runNumber){ this.status = "NORUN"; this.running = false; runInfo.updateUi();}
        else {
            //this.timer.stop();
            //GET RUN INFO (DATE)
            dRuninfo = $.getJSON('php/runInfo.php?', { runNumber : runInfo.runNumber, sysName: runInfo.sysName },
                function(j){
                        runInfo.startTime = j.startTime ;
                        if (j.endTime){ runInfo.endTime = j.endTime; runInfo.status = "CLOSED"; } 
                        else { runInfo.endTime = "ongoing"; runInfo.status = "LIVE"; }
                })


            //UPDATE STREAMS 
            dStreams = $.getJSON('php/streamsinrun.php?',{runNumber : runInfo.runNumber, sysName: runInfo.sysName },
                function(j){
                    j.forEach(function(data){
                            stream = data["term"];
                            if (!runInfo.streams){runInfo.streams = [];}
                            if (runInfo.streams.indexOf(stream) == -1 ){ runInfo.streams.push(stream); }
            })});

            //GET LAST LS
            dLastLs = $.getJSON('php/getLastLs.php?',{runNumber : runInfo.runNumber, sysName: runInfo.sysName },
                function(j){ if (j){runInfo.lastLs = j[0]; } 
            });
            $.when(dRuninfo,dStreams,dLastLs).then(function(){
                runInfo.updateUi();
                if(riverStatus.collector.status){$("#runCollecting").fadeToggle(Math.round(runInfo.interval/2))}
                runReady();
            });
        }
    },
    updateUi : function(){        
        endTime = (runInfo.endTime && runInfo.endTime != "ongoing") ? new Date(runInfo.endTime).toString("dd/MM/yy HH:mm") : runInfo.endTime;
        startTime = (runInfo.startTime) ? new Date(runInfo.startTime).toString("dd/MM/yy HH:mm") : runInfo.startTime;
        if (runInfo.runNumber){ $('#runNumber').text(runInfo.runNumber); } else{ $('#runNumber').text("no Run ongoing");  }
        if (runInfo.lastLs){ $('#lastls').text(runInfo.lastLs); } else{ $('#lastls').text(NASTRING);}
        if (runInfo.streams){ $('#streams').text(runInfo.streams.join(", ")); } else{ $('#streams').text(NASTRING)}
        if (runInfo.startTime){$('#startTime').text(startTime);} else{ $('#startTime').text(NASTRING); }
        if (runInfo.endTime){$('#endTime').text(endTime);} else{ $('#endTime').text(NASTRING); }

        if (runInfo.running){runInfo.timer = new Timer(function(){runInfo.run()},runInfo.interval)};
    }
}

var runRanger = {   
    timer : new Timer(),
    interval : 5000,
    running: true,
    
    start : function(){ this.running = true; this.run(); },
    stop : function(){ this.timer.stop(); this.running = false; },
    run : function(){
        $.getJSON('php/runList.php',{size : 1, sysName: runInfo.sysName},
            function(j){
                run = j["runlist"][0];
                if(runInfo.runNumber!=run.runNumber && !run.endTime){
                    changeRun(run.runNumber);
        }})
        
        if (runRanger.running){runRanger.timer = new Timer(function(){runRanger.run()},runRanger.interval)};
    },
}

var riverStatus = {

    status : "CHECKING...", 
    main : false,
    collector : false,
    
    timer : new Timer(),
    interval : 10000,
    running: true,
    

    start : function(){ this.running = true; this.run(); },
    stop : function(){ 
        this.timer.stop(); 
        this.running = false;   
        this.main = false;
        this.collector = false;
        this.status = "CHECKING...";
    },
    run : function(){

        $.when($.getJSON('php/riverStatus.php'))
            .then(function(j){
                //check runranger plugin
                if (runInfo.sysName in j.systems){
                    riverStatus.main = {
                        "status": j.systems[runInfo.sysName].status,
                        "host"  : j.systems[runInfo.sysName].host
                    } 
                }else{
                    riverStatus.main = {
                        "status": false,
                        "host"  : ""
                    } 
                }

                //check data collector plugin
                if(runInfo.runNumber in j.runs){
                    riverStatus.collector = {
                        "status": j.runs[runInfo.runNumber].status,
                        "host"  : j.runs[runInfo.runNumber].host
                    } 
                }else{
                    riverStatus.collector = {
                        "status": false,
                        "host"  : ""
                    } 
                }
                riverStatus.updateUi();

            })


        if (riverStatus.running){riverStatus.timer = new Timer(function(){riverStatus.run()},riverStatus.interval)};
    },
    updateUi : function(){
        riverStatus.status = "OK";
        
        outString = "<div><ul>";
        if ( !riverStatus.main.status ){ riverStatus.status = "DANGER"; outString = "<li>Main RunRiver not working. </li>"; }
        else { outString+="<li>Main RunRiver Running on node "+riverStatus.main.host+". </li>" }

        if (riverStatus.collector.status){ outString+="<li>RunRiver_"+runInfo.runNumber+" running on node "+riverStatus.collector.host+". </li>" }
        else if (runInfo.status == "LIVE") {riverStatus.status = "FAIL"; outString+="<li>Data collector not running.</li>"; }        
        outString+="</ul></div>" 

        $("#riverstatus").removeClass("btn-success");
        $("#riverstatus").removeClass("btn-warning");
        $("#riverstatus").removeClass("btn-danger");

        $('#riverstatus').attr('data-content',outString )

        if (riverStatus.status=="OK"){$("#riverstatus").addClass("btn-success"); }
        else if (riverStatus.status=="WARNING" || riverStatus =="DANGER"){ $("#riverstatus").addClass("btn-warning"); }
        else if (riverStatus.status=="FAIL"){$("#riverstatus").addClass("btn-danger")}

    }
}

var runList = {  
    table: false,

    timer : new Timer(),
    interval : 10000,
    running: true,
    

    start : function(){this.running = true; this.run(); },
    stop : function(){ this.timer.stop(); this.running = false; },
    run : function(){
        if (!runList.table){
            //runListTable.ajax = "php/runListTable.php?sysName="+runInfo.sysName;
            runListTable.initComplete = runList.updateUi;    
            runList.table = $('#runListTable').dataTable(runListTable);
        }
        else {
            //runList.table.ajax.url("php/runListTable.php?sysName="+runInfo.sysName);
            runList.table.api().ajax.reload(runList.updateUi,false);
        }
    },
    updateUi : function(){
        $('#runListNum').text("Num runs: "+runList.table.fnSettings().fnRecordsTotal());
        if (runList.running){runList.timer = new Timer(function(){runList.run()},runList.interval)};
    }
}

var runRiverList = {  
    table: false,

    timer : new Timer(),
    interval : 10000,
    running: true,
    

    start : function(){this.running = true; this.run(); },
    stop : function(){ this.timer.stop(); this.running = false; },
    run : function(){
        if (!runRiverList.table){
            
            runRiverListTable.initComplete = runRiverList.updateUi;    
            runRiverList.table = $('#runRiverListTable').dataTable(runRiverListTable);
        }
        else {
            
            runRiverList.table.api().ajax.reload(runRiverList.updateUi,false);
        }
    },
    updateUi : function(){
        $('#runRiverListNum').text("Num runs: "+runRiverList.table.fnSettings().fnRecordsTotal());
        if (runRiverList.running){runRiverList.timer = new Timer(function(){runRiverList.run()},runRiverList.interval)};
    }
}

var disksStatus = {
    ramdisk: 0,
    outdisk: 0,
    fudisk: 0,

    timer : new Timer(),
    interval : 10000,
    running: true,
    

    start : function(){ this.running = true; this.run(); },
    stop : function(){ this.timer.stop(); this.running = false; },
    run : function(){

        if (runInfo.runNumber){
            $.getJSON('php/getDisksStatus.php', { runNumber : runInfo.runNumber, sysName: runInfo.sysName },
            function(j){
                disksStatus.ramdisk = (j.ramdiskused.value/j.ramdisk.value*100.).toFixed(2);
                disksStatus.outdisk = (j.outputused.value/j.output.value*100.).toFixed(2);
                disksStatus.fudisk = (j.dataused.value/j.data.value*100.).toFixed(2);
            })    
        }
        disksStatus.updateUi();
        if (disksStatus.running){disksStatus.timer = new Timer(function(){disksStatus.run()},disksStatus.interval)};
    },
    updateUi : function(){
        if (!runInfo.runNumber){
            $('#buramdisk').text(NASTRING);
            $('#buoutdisk').text(NASTRING);
            $('#fuoutdisk').text(NASTRING);
        } else {
            $('#buramdisk').text(disksStatus.ramdisk+"% used");
            $('#buoutdisk').text(disksStatus.outdisk+"% used");
            $('#fuoutdisk').text(disksStatus.fudisk+"% used");
        }
    }
}

var streamChart = {
    slider : false,
    chart : false,
    mchart : false,
    timer : false,
    init : function(){

        this.updateUnit = true;
        this.timePerLs = 1;
        
        this.sliderBound= true;
        this.sliderChanging= false;
    
        this.minLs= false;
        this.maxLs= false;
        this.mMinLs= false;
        this.mMaxLs= false;
        this.mType= false;
        this.mTitle= false;
        this.mmTitle= false;
        this.unit= "Events"; //Events; Bytes
        this.lsInterval = false;
        this.zoomed= false;
        
        //if (this.timer){timer.stop();}
        this.timer = new Timer();
        this.interval = 5000;
        this.running= false;

        this.took= 0;
    
        this.ddData =false;

        this.initSlider();
        this.initChart();
        this.disableDrillDown();

        this.ongoing = true;
    },
    start : function(){ 
        if (this.running){return;}
        this.running = true; 
        this.run(); 
    },
    stop : function(){ 
        if (this.timer){this.timer.stop()}; 
        this.running = false; 
        this.zoomed= false;
        this.disableDrillDown();
        if(this.chart){this.chart.showLoading(WAITINGCHART);}

    },
    run : function(){
        if(riverStatus.collector.status){this.ongoing = true;}
        if ((this.ongoing || this.updateUnit) && runInfo.streams && !streamChart.sliderChanging){
            streamChart.updateSlider();
            if(!streamChart.zoomed){
                streamChart.minLs = $("#ls-slider").rangeSlider("min");
                streamChart.maxLs = $("#ls-slider").rangeSlider("max");
                streamChart.updateChart();        
            }            
        } else {streamChart.next(); }
    },
    updateChart : function(){
        $("#srUpdating").fadeToggle(Math.round(streamChart.interval/2));
        serie = streamChart.chart.get("minimerge");
        if (serie == null){
            serie = streamChart.chart.addSeries({
                borderWidth     : 0.5,
                type            : 'column',
                id              : "minimerge",
                name            : "minimerge",
                yAxis           : "minipercent",
                showInLegend    : false,
                point           : {"events":{"click": streamChart.miniDrillDown}},
                cursor          : "pointer"
            });
        }
        serie = streamChart.chart.get("macromerge");
        if (serie == null){
            serie = streamChart.chart.addSeries({
                borderWidth     : 0.5,
                type            : 'column',
                id              : "macromerge",
                name            : "macromerge",
                yAxis           : "macropercent",
                showInLegend    : false,
                point           : {"events":{"click": streamChart.macroDrillDown}},
                cursor          : "pointer"
            });
        }
        runInfo.streams.forEach(function(stream){
                //Creates data and total serie if doesnt exist
                serie = streamChart.chart.get(stream);
                if (serie == null){
                    serie = streamChart.chart.addSeries({
                        type    : 'column',
                        id      : stream,
                        name    : stream,
                        yAxis   : "rates",
                    });
                    streamChart.chart.addSeries({
                        color   : serie.color,
                        showInLegend: false,          
                        type    : 'spline',
                        id      : stream+"_complete",
                        name    : stream+"_complete",
                        yAxis   : "percent",
                    });
                }
        });
        if (streamChart.updateUnit){
            if ($('#srdivisorcb').is(':checked')) {
                unit = streamChart.unit+"/s"; 
                streamChart.timePerLs = $("#srtimeperls").val();
            } 
            else { 
                unit = streamChart.unit; 
                streamChart.timePerLs = 1; 
            }
            streamChart.chart.yAxis[0].update({title: {text: unit}},false); 
            streamChart.updateUnit = false;
        }
        $.when(  $.getJSON('php/streamhist.php?',
            {
                runNumber   : runInfo.runNumber,
                from        : streamChart.minLs,
                to          : streamChart.maxLs,
                intervalNum : 20,
                sysName     : runInfo.sysName,
                streamList  : runInfo.streams,
                timePerLs   : streamChart.timePerLs,
            })).done(function(j){


                    streamList = j.streamList;
                    took = j.took;
                    minimergeData = j.minimerge;
                    macromergeData = j.macromerge;
                    lsList = j.lsList;

                    streamChart.lsInterval = j.interval;

                    serie = streamChart.chart.get("minimerge");
                    serie.setData(minimergeData.percents,false,false,false);
                    serie = streamChart.chart.get("macromerge");
                    serie.setData(macromergeData.percents,false,false,false);

                    streamList.forEach(function(stream){
                        streamData = j.streams[stream]
                        if (streamChart.unit == "Events"){ data = streamData.dataOut; }
                        else{ data = streamData.fileSize; }    
                        serie = streamChart.chart.get(stream);

                        serie.setData(data,false,false,false);
                        cdata = streamData.percent;
                        
                        serie = streamChart.chart.get(stream+"_complete");
                        serie.setData(cdata,false,false,false);
                    })



                    $("#querytime").text(took.toString()+" ms");
                    streamChart.chart.xAxis[0].setCategories(lsList); //doenst work. dunno why.
                    streamChart.chart.redraw();
                    streamChart.chart.hideLoading();
                    $("#srUpdating").fadeToggle(Math.round(streamChart.interval/2));
                    if(!riverStatus.collector.status){streamChart.ongoing = false;} //need a better way

                    streamChart.next();

            })
    },
    next: function(){
        if (streamChart.running){streamChart.timer.stop(); streamChart.timer = new Timer(function(){streamChart.run()},streamChart.interval)};      
    },
    initChart: function(){
        if (this.chart) { this.chart.destroy(); this.chart = false; $("#"+lsChartConfig.chart.renderTo).empty();}
        lsChartConfig.chart.events.selection = streamChart.selection;
        lsChartConfig.chart.events.click = streamChart.backGroundClick;
        this.chart = new Highcharts.Chart(lsChartConfig);
        this.chart.showLoading(WAITINGCHART);
    },
    initSlider: function(){
        if(streamChart.slider){$("#ls-slider").rangeSlider("destroy");$("#ls-slider").empty();};
        $("#ls-slider").rangeSlider(ls_slider);
        $("#ls-slider").bind("valuesChanged", function(e, data){
            if (data.values.max == runInfo.lastLs) { streamChart.sliderBound = true} else {streamChart.sliderBound=false}
            //if (!streamChart.zoomed){
            //    streamChart.minLs = data.values.min;
            //    streamChart.maxLs = data.values.max;
            //    streamChart.updateChart();    
            //}
            
        });
        $("#ls-slider").bind("userValuesChanged", function(e, data){
            streamChart.minLs = data.values.min;
            streamChart.maxLs = data.values.max;
            streamChart.updateChart();   
        });
        $("#ls-slider").bind("valuesChanging", function(e, data){
            streamChart.timer.stop();
        });
        streamChart.slider = true;
        streamChart.sliderBound = true;
    },
    updateSlider: function(){
        if (runInfo.lastLs < 21) {return};
        sliderTickStep = parseInt(runInfo.lastLs / 10 );
        $("#ls-slider").rangeSlider("bounds", 1, runInfo.lastLs);
        range = $("#ls-slider").rangeSlider("values");
        if (streamChart.sliderBound) {
            diff = runInfo.lastLs - range.max;
            $("#ls-slider").rangeSlider("values", range.min+diff, runInfo.lastLs);
        };
    },
    disableDrillDown : function(){
        if (streamChart.mchart) { streamChart.mchart.destroy(); streamChart.mchart = false; $("#"+mChartConfig.chart.renderTo).empty().unbind();}
        streamChart.selectSR();
        if (!$(".btn-sr,.btn-dd").hasClass("disabled")) {$(".btn-sr,.btn-dd").addClass('disabled') };

    },
    selectSR : function(){
        $(".btn-sr,.btn-dd").removeClass('disabled');
        $(".btn-sr").removeClass('btn-default').addClass('btn-primary');
        $(".btn-dd").removeClass('btn-primary').addClass('btn-default');
        mySwiper2.swipeTo(0);
    },
    selectDD : function(){
        $(".btn-sr,.btn-dd").removeClass('disabled');
        $(".btn-dd").removeClass('btn-default').addClass('btn-primary');
        $(".btn-sr").removeClass('btn-primary').addClass('btn-default');
        mySwiper2.swipeTo(1);
    },
    mmDrillUp : function(){ //Drillup from second to first drilldown
        $("#ddtitle").text(streamChart.mTitle);
    },
    backGroundClick : function(event){
        xRawValue = Math.round(Math.abs(event.xAxis[0].value));
        xRealValue = event.xAxis[0].axis.categories[xRawValue];
        event.point = {name:xRealValue};

        y2RawValue = Math.ceil(event.yAxis[2].value);
        y3RawValue = Math.ceil(event.yAxis[3].value);

        if(y3RawValue < 100){streamChart.mType = "macromerge"}
            else if (y2RawValue<100){streamChart.mType = "minimerge"}
                else {streamChart.mType = false}
        streamChart.firstDrillDown(event);                
        //console.log(event);
        //console.log(event.xAxis[0].value,xRawValue,xRealValue,y2RawValue,y3RawValue,streamChart.mType);
    },
    miniDrillDown : function(event){streamChart.mType="minimerge"; streamChart.firstDrillDown(event);},
    macroDrillDown : function(event){streamChart.mType="macromerge"; streamChart.firstDrillDown(event);},
    firstDrillDown : function(event){   //first level drill down

        streamChart.mMinLs = event.point.name;
        if (streamChart.lsInterval == 1) { streamChart.mMaxLs = streamChart.mMinLs }
            else {streamChart.mMaxLs = event.point.name + streamChart.lsInterval;}
        
        $.when(  $.getJSON('php/minimacroperstream.php?',
            {
                runNumber   : runInfo.runNumber,
                from        : streamChart.mMinLs,
                to          : streamChart.mMaxLs,
                sysName     : runInfo.sysName,
                streamList  : runInfo.streams,
                type        : streamChart.mType,
            })).done(function(j){
                if (streamChart.mchart) { streamChart.mchart.destroy(); streamChart.mchart = false; $("#"+mChartConfig.chart.renderTo).empty();}
                if (streamChart.mType=="minimerge"){
                    mChartConfig.chart.events.drilldown = streamChart.secondDrillDown;
                    mChartConfig.chart.events.drillup = streamChart.mmDrillUp;    
                } else{
                    mChartConfig.chart.events.drilldown = false;
                    mChartConfig.chart.events.drillup = false;    
                }
                streamChart.mchart = new Highcharts.Chart(mChartConfig);
                serie = streamChart.mchart.addSeries({
                        type    : 'column',
                        id      : "drilldown",
                        name    : "drilldown",
                        yAxis   : "percent",
                        data    : j.percents,
                });
                streamChart.mTitle = " "+streamChart.mType+", LS Range: "+streamChart.mMinLs.toString()+" - "+streamChart.mMaxLs.toString();
                $("#ddtitle").text(streamChart.mTitle);
                streamChart.selectDD();
            })
    },
    secondDrillDown : function(event){    //second level drill down
        stream = event.point.name;
        $.when(  $.getJSON('php/minimacroperbu.php?',
            {
                runNumber   : runInfo.runNumber,
                from        : streamChart.mMinLs,
                to          : streamChart.mMaxLs,
                sysName     : runInfo.sysName,
                stream      : stream,
                type        : streamChart.mType,
            })).done(function(j){
                serie = streamChart.mchart.addSeriesAsDrilldown(event.point, { 
                    type    : 'column',
                    id      : "drilldown",
                    name    : "BUs",
                    yAxis   : "percent",
                    data    : j.percents,
                });
                streamChart.mmTitle = " "+streamChart.mType+", Stream: "+stream+" || LS Range: "+streamChart.mMinLs.toString()+" - "+streamChart.mMaxLs.toString();
                $("#ddtitle").text(streamChart.mmTitle);
            })
    },

    selection : function(event){          
        if (event.xAxis) {
            event.preventDefault();
            var xAxis = event.xAxis[0];
            min = Math.round(xAxis.min);
            max = Math.round(xAxis.max);

            min = xAxis.axis.categories[min];
            max = xAxis.axis.categories[max];

            if (min<1) { min = 1};
            if ((max-min)<21){max = min+20}
            streamChart.minLs = min;
            streamChart.maxLs = max;
            
            streamChart.updateChart();

            if(!streamChart.zoomed){
                // use jQuery HTML capabilities to add a button to reset the selection 
                streamChart.chart.$resetButton = $('<button>Reset view</button>')
                .css({
                    position: 'absolute',
                    top: '20px',
                    right: '50px',
                    zIndex: 50
                })
                .click(function() {
                    streamChart.zoomed = false;
                    streamChart.minLs = $("#ls-slider").rangeSlider("min");
                    streamChart.maxLs = $("#ls-slider").rangeSlider("max");
                    streamChart.updateChart();     
                    streamChart.chart.$resetButton.remove(); 
                })
                .appendTo(streamChart.chart.container);
            }
            streamChart.zoomed = true;
        }
    }
}

var hrChart = {
    chart : false,
    init : function(){
        this.numVal= 50;
        this.timer = false;
        this.interval = 5000;
        this.running= false;    
        this.initChart()
    },
    start : function(){ 
        if (this.running){return;}
        this.running = true; 
        this.run(); 
    },
    stop : function(){ 
        this.timer.stop();
        this.running = false; 
        if(this.chart){this.chart.showLoading(WAITINGCHART);}

    },
    run : function(){
        if (runInfo.runNumber){
            hrChart.updateChart();   
            return;     
        } 
        hrChart.next();
    },
    updateChart : function(){
        
        hrChart.timer.stop(); 
        timeperls = $("#timeperls").val();

        $.when(  $.getJSON('php/hltrates.php?',
            {
                runNumber   : runInfo.runNumber,
                numVal      : hrChart.numVal,
                timePerLs   : timeperls,
            })).done(function(j){
                    pa = j["path-accepted"];
                    pa.forEach(function(path){
                        name = path.name;
                        data = path.data;
                        serie = hrChart.chart.get(name);
                        if (serie == null){
                            serie = hrChart.chart.addSeries({
                                type            : 'line',
                                id              : name,
                                name            : name,
                            });
                            serie = hrChart.chart.get(name);
                        }
                        serie.setData(data);
                    })
                    hrChart.chart.hideLoading();
                    hrChart.chart.redraw();
                    hrChart.next();
            })
    },
    next: function(){
        hrChart.timer.stop(); 
        if (hrChart.running){hrChart.timer = new Timer(function(){hrChart.run()},hrChart.interval)};      
    },
    initChart: function(){
        if (this.chart) { this.chart.destroy(); this.chart = false; $("#"+hrChartConfig.chart.renderTo).empty(); }
        this.chart = new Highcharts.Chart(hrChartConfig);
        this.chart.showLoading(WAITINGCHART);
    }
}

var microstatesChart = {
    chart: false,
    init : function() {
        this.status= "off"; //off; waitingforlegend; ready
        this.lastTime = 0;
        this.series = [];
        this.timer = new Timer();
        this.interval = 5000;
        this.running= false;
        this.initStatus = false;
        this.initChart();
    },
    start : function(){ 
        if (this.running){return;}
        this.running = true; 
        this.run(); 
    },
    stop : function(){ 
        if (this.timer){this.timer.stop()}; 
        this.running = false;
        this.status = "off"; 
        this.lastTime = 0;
        this.series = [];
        this.initStatus = false;
        if(this.chart){this.chart.showLoading(WAITINGCHART);}
    },
    run : function(){
        if (microstatesChart.initStatus && riverStatus.collector.status){
            if (microstatesChart.status == "off"){ this.getLegend(); }
            else if (microstatesChart.status == "ready"){
                $.when( $.getJSON('php/nstates.php',{sysName: runInfo.sysName}))
                .then( function(j){
                    time = j.time;
                    data = j.entries;
                    if (time != microstatesChart.lastTime){
                        microstatesChart.lastTime = time;
                        microstatesChart.series.forEach(function(id){
                            serie = microstatesChart.chart.get(id);
                            shift = serie.data.length>30;
                            value = null;
                            if (typeof data[id] != "undefined"){value = data[id]};
                            serie.addPoint([time,value],false,shift);
                        })
                        microstatesChart.chart.redraw();
                    }
                    microstatesChart.next();
                })
                return;
            }
        }
        else if (runInfo.status == "CLOSED") { this.status = "off"; this.chart.showLoading(NODATACHART);}
        microstatesChart.next();
    },
    next : function() {
        microstatesChart.timer.stop(); 
        if (microstatesChart.running){microstatesChart.timer = new Timer(function(){microstatesChart.run()},microstatesChart.interval)};
    },
    initChart : function(){
        if (this.chart) { this.chart.destroy(); this.chart = false; $("#"+msChartConfig.chart.renderTo).empty().unbind(); }
        this.chart = new Highcharts.Chart(msChartConfig);
        this.chart.showLoading(WAITINGCHART);
        this.initStatus = true;
    },
    getLegend : function(){
        if (microstatesChart.status == "off"){
            microstatesChart.status = "waitingforlegend";
            $.when($.getJSON("php/ulegenda.php?", { runNumber : runInfo.runNumber, sysName: runInfo.sysName }))
            .then(function(j){
                if (!j) { microstatesChart.status = "off"; return false; }
                names = j.split(" ");
                names.forEach(function(name){
                    value = name.split("=");
                    if (value[1] != "" && name != ""){
                        value[0] = parseInt(value[0]);
                        microstatesChart.series.push(value[0]);
                        serie = microstatesChart.chart.addSeries({
                            type    : "area",
                            //color   : calcolor(value[0]),
                            id      : value[0],
                            name    : value[1]
                        })
                    }
                })       
                microstatesChart.status = "ready";
                microstatesChart.chart.hideLoading();
            })

        }
        
    }
}

var logTable = {  
    table: false,
    scrollPos: 0,

    timer : new Timer(),
    interval : 30000,
    running: true,
    

    start : function(){ this.running = true; this.run(); },
    stop : function(){ this.timer.stop(); this.running = false; },
    run : function(){
        if (!logTable.table){
            logTableConfig.initComplete = logTable.updateUi;    
            logTable.table = $('#logTable').DataTable(logTableConfig);
        }
        else {
            logTable.scrollPos=$(".dataTables_scrollBody").scrollTop();
            logTable.table.ajax.reload(logTable.updateUi,false); 
        }        
        
    },
    updateUi: function(){
        $(".dataTables_scrollBody").scrollTop(logTable.scrollPos);
        num = logTable.table.page.info().recordsTotal;
        $('#logNum').text(num);
        if (num > 0){ 
            $('#logNum').removeClass("label-success");
            $('#logNum').addClass("label-danger");
        }else{
            $('#logNum').removeClass("label-danger");
            $('#logNum').addClass("label-success");
        }
        if (logTable.running){logTable.timer = new Timer(function(){logTable.run()},logTable.interval)};   
    }
}

function setControls(){

    $('#srdivisorcb').change(function() {
        streamChart.updateUnit = true;
    });


    $('#btn-unit-e').click(function() {    
        if ($('#btn-unit-e').hasClass('btn-primary')){return;}
        streamChart.unit="Events";
        streamChart.updateUnit=true;
        $('#btn-unit-e').removeClass('btn-default');
        $('#btn-unit-e').addClass('btn-primary');
        $('#btn-unit-b').removeClass('btn-primary');
        $('#btn-unit-b').addClass('btn-default');
        
    })
    $('#btn-unit-b').click(function() {    
        streamChart.unit="Bytes";
        streamChart.updateUnit=true;
        if ($('#btn-unit-b').hasClass('btn-primary')){return;}
        $('#btn-unit-b').removeClass('btn-default');
        $('#btn-unit-b').addClass('btn-primary');
        $('#btn-unit-e').removeClass('btn-primary');
        $('#btn-unit-e').addClass('btn-default');
    })

    // Catch all events related to changes
    $('.is-float').on('change keyup', function() {
      // Remove invalid characters
      var sanitized = $(this).val().replace(/[^0-9.]/g, '');
      sanitized = sanitized.replace(/\.(?=.*\.)/, '');
      // Update value
      $(this).val(sanitized);
    });

    //$("#timeperls").keypress(function (e) {
    // //if the letter is not digit then display error and don't type anything
    //if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
    //    //display error message
    //    $("#errmsg").html("Digits Only").show().fadeOut("slow");
    //           return false;
    //}
    //});

    $("#indexlist").on('click','li',function(){
        runInfo.sysName = $(this).find("a").text();
        runInfo.indexName = runInfo.indexList[runInfo.sysName];
        $("#indexname").text(runInfo.sysName);
        changeRun(false);
        window.location.href = "#"+runInfo.sysName;
        runList.stop();
        runList.start();
    })

    mySwiper = $('.swiper-main').swiper({
        noSwiping: true,
        mode: "vertical"
    });
    mySwiper2 = $('.swiper-nested-sr').swiper({
        noSwiping: true,
        mode: "horizontal"
    });

    //new Timer(function () { mySwiper.reInit(); mySwiper.resizeFix(true); }, 500);
    $(".btn-dd").click(function(e){
        streamChart.selectDD();
    });
    $(".btn-sr").click(function(e){
        streamChart.selectSR();
    });
    $("#logButton").click(function(e){
        mySwiper.swipeTo(1);
    });
    $("#hltButton").click(function(e){
        mySwiper.swipeTo(2);
    });
    $("#f3monButton").click(function(e){
        mySwiper.swipeTo(0);
    });


    $("#riverstatus").popover({container:'body',html:true});
    $('#runranger').tooltip({animation:true});
    $("#runranger").click(function(e){
        $(this).toggleClass("btn-success");
        $(this).toggleClass("btn-danger");
        if ($(this).hasClass("btn-success")){runRanger.start(); } 
        else { runRanger.stop() }
    });

    $('.btn-rec').click(function() {
        $("#recModal").find("#runNumber").text(runInfo.runNumber);
        $("#recModal").modal("show");
    });

    $("#runListTable").on("click", ".run-show",function() {
        rn = $(this).closest(".row-tools").attr("number");

        runRanger.stop();
        changeRun(rn);

        $("#runranger").removeClass("btn-success");
        $("#runranger").addClass("btn-danger");
        //stopItAll();
    });

    $("#runRiverListTable").on("click", ".run-close",function() {
        
        rn = $(this).closest(".row-tools").attr("number");
        selectedRun = rn;
        $("#closeModal").find("#runNumber").text(selectedRun);
        $("#closeModal").modal("show");
    });

    $("#recModal").on("click", ".btn-rec-keep",function() {
        $.when($.getJSON('php/startCollector.php',{runNumber : runInfo.runNumber, sysName: runInfo.sysName}))
        .then(
            function(j){
        })
    });

    $("#closeModal").on("click", ".run-close-ok",function() {
        $.when($.getJSON('php/closeRun.php',{runNumber : selectedRun, sysName: runInfo.sysName}))
        .then(
            function(j){
        })

    });
}

function reloader(){
    if (window.location.hash) { 
        window.location.href = "#"+runInfo.sysName;
        if (runInfo.runNumber){window.location.href+=","+runInfo.runNumber}
    }
    window.location.reload(true);
};

function runReady(){
    streamChart.start();
    microstatesChart.start();
//    hrChart.start(); 
};

function startItAll(){

    runInfo.start();   
    runRanger.start();
    riverStatus.start();
    runList.start();
    runRiverList.start();
    disksStatus.start();
    logTable.start();    
    streamChart.init(); 
    microstatesChart.init();

//    hrChart.init(); 
};

function changeRun(runNumber){
    if (window.location.hash) {if (runNumber){window.location.href = "#"+runInfo.sysName+","+runNumber} }

    runInfo.stop();
    riverStatus.stop()
    streamChart.stop();
    microstatesChart.stop();
//    hrChart.stop();

    runInfo.runNumber = runNumber;
    
    runInfo.start();
    riverStatus.start()
    streamChart.init();
    microstatesChart.init();
//    hrChart.init();

}

function dumpInfo(ms){
    console.log("Num timers set: "+window.activeTimers);
    window.t = new Timer(function(){dumpInfo(ms)},ms);   
}

function getIndices(){
    $.when($.getJSON('php/getIndices.php'))
    .then(function(j){
        runInfo.indexList = j;
        sysList = Object.keys(j);
        sysList.forEach(function(item){
            $("#indexlist").append('<li><a>'+item+'</a></li>');
        })
        if (sysList.indexOf(selectedIndex) >= 0){defIndex = selectedIndex }
            else {defIndex = sysList[0]}
      
        runInfo.sysName = defIndex;
        $("#indexname").text(defIndex);
        startItAll();
    })
}

function checkHash(){
    selectedIndex = DEFAULTINDEX;
    selectedRun = false;

    if(window.location.hash) {
        values = window.location.hash.substring(1).split(',');
        selectedIndex = values[0];
        if (values.length > 1){selectedRun = values[1]; }
    }
}

function f3mon(){
    setControls();
    checkHash();
    if(selectedRun){runInfo.runNumber=selectedRun}
    getIndices();
    setTimeout(function(){reloader();},60*60*1000);

    //dumpInfo(3000);
}

