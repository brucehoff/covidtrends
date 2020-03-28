// dataColumn is Confirmed or Deaths
function processDailyData(dataColumn, callback) {
	$.ajax({
		url: "https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_daily_reports",
		type: "GET",
  		success: function(fileList) {
			var dateStampList = [];
			var dateStampURLMap = {};
			this.cumulativeCounty = {};
			for (var file of fileList) {
				if (/.csv$/.test(file.name)) {
					var datePrefix = file.name.substring(0, file.name.length-4)
					var fileDateStamp = Date.parse(datePrefix)
					dateStampList.push(fileDateStamp);
					dateStampURLMap[fileDateStamp]={"url":file.download_url,"dateLabel":datePrefix}
				}
			}
			dateStampList.sort();
			console.log("There are", dateStampList.length, "date stamps.");
			this.threadsStarted=0;
			this.threadsCompleted=0;
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
var cumulativeCounty = {};
var threadsStarted = 0;
var threadsCompleted = 0;
function threadsCompletedIncr() {this.threadsCompleted=this.threadsCompleted+1};
function areAllThreadsDone() {
	console.log("ThreadsStarted:", this.threadsStarted, "threadsCompleted:", this.threadsCompleted)
	return this.threadsCompleted>=this.threadsStarted;
}

function dateFileHandler(rows, dateStamp, dataColumn, callback) {
	for (row of rows) {
		if (row.Province_State=="Washington") {
			var county = row["Admin2"];
			if (!(county in this.cumulativeCounty)) {
				this.cumulativeCounty[county]={};
			}
			this.cumulativeCounty[county][dateStamp] = row[dataColumn];
			if (county=="King") {
				console.log(this.cumulativeCounty[county]);
			}
		}
	}
	threadsCompletedIncr();
	if(areAllThreadsDone()) {
		processCumulativeCountyData(callback)
	}
}

function processCumulativeCountyData(callback) {
	var allDateStamps = [];
	for (county of Object.keys(this.cumulativeCounty)) {
		var singleCountyData = this.cumulativeCounty[county];
		//console.log("County", county, "Number of dates:", Object.keys(singleCountyData).length);
		for (ds of Object.keys(singleCountyData)) {
			if (allDateStamps.indexOf(ds)==-1) {
				allDateStamps.push(ds);
			}
		}
	}
	allDateStamps.sort();
	console.log("There are ", allDateStamps.length, " date stamps.");
	var result = [];
	// each row is one county
	for (county of Object.keys(this.cumulativeCounty)) {
		var singleCountyData = this.cumulativeCounty[county];
		//console.log(county, "has", Object.keys(singleCountyData).length, "time stamps.");
		var row = {};
		row["Province/State"]=county; // TODO use this, not Country/Region
		row["Country/Region"]=county; // TODO change to US
		row["Lat"]="na";
		row["Long"]="na";
		for (dateStamp of allDateStamps) {
			if (dateStamp in Object.keys(singleCountyData)) {
				row[dateStamp]=singleCountyData[dateStamp]; // TODO change key to human readable date
			} else {
				row[dateStamp]=0
			}
		}
		result.push(row);
	}
	callback(result)
}


			