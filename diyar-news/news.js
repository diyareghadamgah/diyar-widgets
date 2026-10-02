const NEWS_URL =
"https://raw.githubusercontent.com/diyareghadamgah/diyar-widgets/main/diyar-news/news.json?t=" + Date.now();


let allNews = [];


// جلوگیری از XSS: تمام متن‌هایی که از news.json می‌آیند (عنوان، خلاصه و ...)
// در نهایت از یک منبع RSS خارجی سرچشمه می‌گیرند و باید پیش از درج در HTML
// escape شوند.
function escapeHtml(str){
    if(str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// اعتبارسنجی لینک: فقط آدرس‌های http/https معتبر پذیرفته می‌شوند
function safeLink(url){
    try{
        const u = new URL(url, window.location.href);
        if(u.protocol === "http:" || u.protocol === "https:") return u.href;
    }catch(e){}
    return "#";
}


// تبدیل تاریخ به شمسی
function formatNewsDate(dateString){

    if(!dateString) return "";

    let d = new Date(dateString);

    return d.toLocaleDateString("fa-IR",{
        year:"numeric",
        month:"2-digit",
        day:"2-digit"
    });

}



// دریافت اخبار
fetch(NEWS_URL)

.then(r=>r.json())

.then(data=>{


allNews = data.news || [];


// شمارنده‌ها

let nc = document.getElementById("newsCount");
if(nc)
nc.textContent = allNews.length;


let ic = document.getElementById("importantCount");
if(ic)
ic.textContent =
allNews.filter(n=>n.important).length;


let dc = document.getElementById("todayDate");
if(dc)
dc.textContent =
new Date().toLocaleDateString("fa-IR",{
year:"numeric",
month:"2-digit",
day:"2-digit"
});



// نمایش

showFeatured();

showNews(allNews);

showTicker();



})

.catch(()=>{

let container = document.getElementById("newsContainer");
if(container){
container.innerHTML=
`
<div style="color:red;text-align:center;padding:30px">
❌ خطا در دریافت اخبار
</div>
`;
}

});




// خبر ویژه

function showFeatured(){


if(allNews.length===0)
return;


let news =
allNews.find(n=>n.important)
|| allNews[0];

let featured = document.getElementById("featuredNews");
if(!featured) return;


featured.innerHTML=

`

<div class="news-card featured">


<div class="news-image">

<img src="${news.image ? safeLink(news.image) : 'https://placehold.co/800x400?text=DIAR+NEWS'}" alt="${escapeHtml(news.title)}">

</div>


<div class="news-body">


<div class="news-title">

⭐ ${escapeHtml(news.title)}

</div>


<div class="news-summary">

${escapeHtml(news.summary || news.title)}

</div>


<div class="news-date">

📅 ${formatNewsDate(news.date)}

</div>


<a href="news.html?id=${allNews.indexOf(news)}"
class="read-more">

مطالعه خبر

</a>


</div>


</div>

`;

}





// لیست اخبار

function showNews(newsArray){


let html="";


newsArray.forEach((item,index)=>{


html +=


`

<div class="news-card">


<div class="news-image">

<img src="${item.image ? safeLink(item.image) : 'https://placehold.co/600x350?text=NEWS'}" alt="${escapeHtml(item.title)}">

</div>


<div class="news-body">


<div class="news-title">

${escapeHtml(item.title)}

</div>



<div class="news-summary">

${escapeHtml(item.summary || "")}

</div>


<div class="news-date">

📅 ${formatNewsDate(item.date)}

</div>



<a href="news.html?id=${index}"
class="read-more">

ادامه خبر

</a>



</div>


</div>


`;


});


let container = document.getElementById("newsContainer");
if(container) container.innerHTML=html;


}




// جستجو

let search =
document.getElementById("searchInput");


if(search){

search.addEventListener("keyup",function(){


let value=this.value.trim();


if(value===""){

showFeatured()

showNews(allNews);


showTicker();

return;

}



let result =
allNews.filter(item=>

(item.title||"").includes(value)

||

(item.summary||"").includes(value)

);


showNews(result);



});


}
function showTicker(){

    let box = document.getElementById("tickerContent");

    if(!box) return;


    let html = "";


    allNews.slice(0,15).forEach(news=>{

        html += `
        <span>
        📰 ${escapeHtml(news.title)}
        </span>
        `;

    });


    box.innerHTML = html;

}
