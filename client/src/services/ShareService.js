const baseURLint = "http://localhost:3000/api/shares/"
const baseURLext = "https://www.alphavantage.co/query?function=";

const intraDayQuery = "TIME_SERIES_INTRADAY&symbol=";
const intraDayParams1min = "&interval=1min&outputsize=compact"
const intraDayParams60min = "&interval=60min&outputsize=compact"

const dailyQuery = "TIME_SERIES_DAILY&symbol=";
const dailyParams = "&outputsize=compact"

const key1 = "&apikey=QTA1FETX7I0B34WC";
const key2 = "&apikey=FT7FZ6ZFM0DJ6CZT";


//Returns an object with all the neccessary date info
const getCurrentTimestamp = function(){

  const dateObj = new Date();

  const year = dateObj.getFullYear();
  let month = parseInt(dateObj.getMonth()) + 1;
  month.toString();
  let day = dateObj.getDate();

  let hour = (dateObj.getHours()-5).toString();
  let mins = dateObj.getMinutes().toString();
  const secs = ":00";

  if(month < 10) month = '0' + month;
  if(day < 10) day = '0' + day;
  if(hour < 10) hour = '0' + hour;
  if(mins < 10) mins = '0' + mins;

  const date = year + '-' + (month) + '-' + day;
  const time = hour + ':' + mins + secs;

  return {
    timestamp: date + " " + time,
    date: date,
    month: month,
    day: day,
    time: time,
    hour: hour,
  }
}

export default {

  getShares(){
    return fetch(baseURLint)
    .then(docs => docs.json());
  },

  //Updates the prices of all shares based on the most recent closing price
  updateSharePrices(shares){
    let fetchPromises = [];
    let responsePromises = [];

    //request data for each share
    for(let i = 0; i < shares.length; i++){
      fetchPromises.push(fetch(baseURLext + intraDayQuery + shares[i].ticker + intraDayParams1min + key2))
    }

    return Promise.all(fetchPromises) //once the fetch requests have resolved
    .then((docs) => {
      docs.forEach((doc) => {
        responsePromises.push(doc.json()); //push each promise response
      })
    })
    .then(() => {
      return Promise.all(responsePromises) //Once all docs have converted to JSON
      .then((docs) => {
        for(let i = 0; i < docs.length; i++){
          if(docs[i]["Meta Data"]){
            const timestamp = docs[i]["Meta Data"]["3. Last Refreshed"];
            const price = docs[i]["Time Series (1min)"][timestamp]["4. close"];
            shares[i]["price"] = price;
          }
        }
      })

    });

},

  postShares(payload){
    fetch(baseURLint, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {"Content-Type": "application/json"}
    })
    .then(res => res.json());
  },

  //Returns all the closing prices throughout the day at hour intervals
  getPricesIntraday(ticker){


    const currTimestamp = getCurrentTimestamp();
    let prices = [];

    return fetch(baseURLext + intraDayQuery + ticker + intraDayParams60min + key2)
    .then(doc => doc.json())
    .then((doc) => {
      if(doc["Meta Data"]){
        const latestTimestamp = doc["Meta Data"]["3. Last Refreshed"];
        const latestDay = latestTimestamp.slice(8,10)
        const latestHour = latestTimestamp.slice(11,13)

        const sharesData = Object.values(doc["Time Series (60min)"])

        const closingTime = "15:30:00"

        if(currTimestamp.day > latestDay){ //if market has not opened today
          for(let i = 0; i < 7; i++){
            prices.push(parseFloat(sharesData[i]["4. close"])) //Get yesterdays prices
          }
        }else if(currTimestamp.time >= closingTime){ //if market has closed for the day
          for(let i = 0; i < 7; i++){
            prices.push(parseFloat(sharesData[i]["4. close"])) //get todays prices
          }
        }else if(currTimestamp.time < closingTime){ //if market is open
          const priceIntervals = latestHour - 8; //Calculate how many prices intervals there are
          for(let i = 0; i < priceIntervals; i++){
            prices.push(parseFloat(sharesData[i]["4. close"])); //get prices
          }
        }
        return prices;
      }
      return null;
    })
  },


  //Gets all the daily closing prices for the current week
  getPricesDaily(ticker){

    let prices = [];

    return fetch(baseURLext + dailyQuery + ticker + dailyParams + key1)
    .then(doc => doc.json())
    .then((doc) => {
      if(doc["Meta Data"]){
        const latestDate = new Date(doc["Meta Data"]["3. Last Refreshed"]);
        const numberOfDays = latestDate.getDay();
        const sharesData = Object.values(doc["Time Series (Daily)"])

        for(let i = 0; i < numberOfDays; i++){
          prices.push(parseFloat(sharesData[i]["4. close"]));
        }
        return prices;
      }
      return null;
    })
  },

  //Gets the closing prices all the trading days in the month so far
  getPricesMonth(ticker){
    let prices = [];

    return fetch(baseURLext + dailyQuery + ticker + dailyParams + key1)
    .then(doc => doc.json())
    .then((doc) => {
      if(doc["Meta Data"]){
        const latestDate = new Date(doc["Meta Data"]["3. Last Refreshed"]);
        let month = latestDate.getMonth();

        const sharesData = Object.entries(doc["Time Series (Daily)"]);

        let date = new Date(sharesData[0][0]);
        let counter = 0;

        let labels = [];

        //while the retrieved timestamp month is the same as the current month 
        while(month === date.getMonth()){
          labels.unshift(date.getDate())
          prices.push(parseFloat(sharesData[counter][1]["4. close"]));
          counter++;
          date = new Date(sharesData[counter][0]);
          console.log(date.getDate());
        }

        return {
          prices: prices,
          labels: labels
        };
      }
      return {
        prices: null,
        labels: []
      };
    })

  },

  update(id, payload){
    return fetch(baseURLint + id, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: {'Content-Type': 'application/json'}
    })
    .then(res => res.json())
  }
}
