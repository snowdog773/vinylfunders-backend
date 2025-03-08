var axios = require("axios").default;
const getAuth0Token = () => {
  var options = {
    method: "POST",
    url: "https://dev-q7f3hrr85f78wcog.uk.auth0.com/oauth/token",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "11kRdcGvEoASBMTId2Xti72salAzXUlM",
      client_secret: process.env.AUTH0_SECRET,
      audience: "https://dev-q7f3hrr85f78wcog.uk.auth0.com/api/v2/",
    }),
  };

  return axios.request(options);
};

module.exports = getAuth0Token;
