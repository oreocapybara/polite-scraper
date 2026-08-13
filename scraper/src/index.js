const res = await fetch("https://books.toscrape.com/robots.txt");
console.log(res.status);
console.log(await res.text());
