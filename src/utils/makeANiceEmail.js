module.exports = text => `
  <div className="email" style="
    border: 1px solid black;
    padding: 20px;
    font-family: sans-serif;
    line-height: 2;
    font-size: 20px;
  ">
    <h2>Chào bạn!</h2>
    <p>${text}</p>
    <p>😘, Danny Vu</p>
  </div>
`;