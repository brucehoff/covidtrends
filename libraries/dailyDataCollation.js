// dataColumn is Confirmed or Deaths
function processDailyData(dataColumn, callback) {
	if (dataColumn in this.cachedResult) {
		callback(cachedResult[dataColumn]);
		return;
	}
	$.ajax({
		url: "https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_daily_reports",
		type: "GET",
  		success: function(fileList) {
  			initializeGlobalVars();
			var dateStampList = [];
			var dateStampURLMap = {};
			for (var file of fileList) {
				if (/.csv$/.test(file.name)) {
					var datePrefix = file.name.substring(0, file.name.length-4)
					var fileDateStamp = Date.parse(datePrefix)
					dateStampList.push(fileDateStamp);
					dateStampURLMap[fileDateStamp]={"url":file.download_url,"dateLabel":datePrefix}
				}
			}
			dateStampList.sort();
			//console.log("There are", dateStampList.length, "date stamps.");
			for (dateStamp of dateStampList) {
				let ds = dateStampURLMap[dateStamp].dateLabel; //dateStamp
				Plotly.d3.csv(dateStampURLMap[dateStamp].url, function(data){ dateFileHandler(data, ds, dataColumn, callback)});
				threadsStarted=threadsStarted+1;
			}
		},
		error: function(error) {
			console.log(`Error ${error}`)
		}
	})
}

var cachedResult={};
var cumulativeRegion = {};
var threadsStarted = 0;
var threadsCompleted = 0;

function initializeGlobalVars() {
	this.cumulativeRegion = {};
	this.threadsStarted=0;
	this.threadsCompleted=0;
}
function threadsCompletedIncr() {this.threadsCompleted++};
function areAllThreadsDone() {
	//console.log("ThreadsStarted:", this.threadsStarted, "threadsCompleted:", this.threadsCompleted)
	return this.threadsCompleted>=this.threadsStarted;
}

function dateFileHandler(rows, dateStamp, dataColumn, callback) {
	for (row of rows) {
		if ("Country/Region" in row && row["Country/Region"]=="US" ||
				 "Country_Region" in row && row["Country_Region"]=="US") {
			var region = "unknown";
			if ("Province_State" in row) region=row["Province_State"];
			if ("Province/State" in row) region=row["Province/State"];
			if (!(region in this.cumulativeRegion)) {
				this.cumulativeRegion[region]={};
			}
			if (!(dateStamp in this.cumulativeRegion[region])) {
				this.cumulativeRegion[region][dateStamp]=0;
			}
			this.cumulativeRegion[region][dateStamp] += parseInt(row[dataColumn]);
		}
	}
	threadsCompletedIncr();
	if(areAllThreadsDone()) {
		result = processCumulativeRegionData()
		this.cachedResult[dataColumn]=result
		callback(result)
	}
}

function processCumulativeRegionData() {
	var allDateStamps = [];
	var region;
	for (region of Object.keys(this.cumulativeRegion)) {
		var singleRegionData = this.cumulativeRegion[region];
		for (ds of Object.keys(singleRegionData)) {
			if (allDateStamps.indexOf(ds)==-1) {
				allDateStamps.push(ds);
			}
		}
	}
	allDateStamps.sort();
	var result = [];
	// each row is one region
	for (region of Object.keys(this.cumulativeRegion)) {
		var singleRegionData = this.cumulativeRegion[region];
		//console.log(region, "has", Object.keys(singleRegionData).length, "time stamps.");
		var row = {};
		row["Province/State"]=region; // TODO use this, not Country/Region
		row["Country/Region"]=region; // TODO change to US
		row["Lat"]="na";
		row["Long"]="na";
		var dateStamp;
		for (dateStamp of allDateStamps) {
			if (dateStamp in singleRegionData) {
				row[dateStamp]=singleRegionData[dateStamp];
			} else {
				row[dateStamp]=0
			}
		}
		result.push(row);
	}
	return result;
}


			