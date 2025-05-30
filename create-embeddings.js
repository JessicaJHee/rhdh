var url = 'http://localhost:7007/api/rag-ai/embeddings/catalog';
var token = process.env.EXTERNAL_CALLER_AUTH_KEY;
var entities = ['Component'];

for (var i = 0; i < entities.length; i++) {
  var options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json; charset=utf-8',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({
      entityFilter: {
        kind: entities[i],
      },
    }),
  };

  fetch(url, options)
    .then(function (res) {
      return res.json();
    })
    .then(function (jsonData) {
      console.log(jsonData);
      console.log(jsonData.status);
    });
}

url = 'http://localhost:7007/api/rag-ai/embeddings/tech-docs';

options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json; charset=utf-8',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    entityFilter: {},
  }),
};

fetch(url, options)
  .then(res => res.json())
  .then(json => {
    console.log(json);
  })
  .catch(err => {
    console.error('Error:', err);
  });