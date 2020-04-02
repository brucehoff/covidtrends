// dataColumn is Confirmed or Deaths
function processDailyData(dataColumn, callback) {
	if (dataColumn in this.cachedResult) {
		callback(cachedResult[dataColumn]);
		return;
	}

	fetch('https://api.github.com/repos/CSSEGISandData/COVID-19/contents/csse_covid_19_data/csse_covid_19_daily_reports')
		.then(response => {
			return response.json();
		})
		.then(fileList => {
			const dateStampList = [];
			const dateStampURLMap = {};
			fileList.forEach(file => {
				if (/.csv$/.test(file.name)) {
					var datePrefix = file.name.substring(0, file.name.length - 4)
					var fileDateStamp = Date.parse(datePrefix)
					dateStampList.push(fileDateStamp);
					dateStampURLMap[fileDateStamp] = { "url": file.download_url, "dateLabel": datePrefix }
				}
			});
			dateStampList.sort();
			const allPromises = [];
			dateStampList.forEach(dateStamp => {
				let ds = dateStampURLMap[dateStamp].dateLabel; //dateStamp
				let promise = new Promise((resolve, reject) => {
					Plotly.d3.csv(dateStampURLMap[dateStamp].url, function (err, data) {
						if (err instanceof Error) {
							reject(err);
						} else {
							resolve(data);
						}
					});
				});
				allPromises.push(promise);
				promise.then(data => {
					dateFileHandler(data, ds, dataColumn, callback);
				});
			})
			Promise.all(allPromises).then(() => {
				let result = processCumulativeRegionData();
				cachedResult[dataColumn] = result;
				callback(result);
			}).catch(err => {
				console.log(`Error: ${err}`)
			});
		})
}

var cachedResult = {};
var cumulativeRegion = {};

function initializeGlobalVars() {
	this.cumulativeRegion = {};
}

function dateFileHandler(rows, dateStamp, dataColumn, callback) {
	for (row of rows) {
		if ("Country/Region" in row && row["Country/Region"] == "US" ||
			"Country_Region" in row && row["Country_Region"] == "US") {
			var region = "unknown";
			if ("Province_State" in row) region = row["Province_State"];
			if ("Province/State" in row) region = row["Province/State"];
			if (!(region in this.cumulativeRegion)) {
				this.cumulativeRegion[region] = {};
			}
			if (!(dateStamp in this.cumulativeRegion[region])) {
				this.cumulativeRegion[region][dateStamp] = 0;
			}
			this.cumulativeRegion[region][dateStamp] += parseInt(row[dataColumn]);
		}
	}
}

function processCumulativeRegionData() {
	var allDateStamps = [];
	var region;
	for (region of Object.keys(this.cumulativeRegion)) {
		var singleRegionData = this.cumulativeRegion[region];
		for (ds of Object.keys(singleRegionData)) {
			if (allDateStamps.indexOf(ds) == -1) {
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
		row["Province/State"] = region; // TODO use this, not Country/Region
		row["Country/Region"] = region; // TODO change to US
		row["Lat"] = "na";
		row["Long"] = "na";
		var dateStamp;
		for (dateStamp of allDateStamps) {
			if (dateStamp in singleRegionData) {
				row[dateStamp] = singleRegionData[dateStamp];
			} else {
				row[dateStamp] = 0
			}
		}
		result.push(row);
	}
	return result;
}


