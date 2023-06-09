const express = require("express");
const MongoClient = require("mongodb").MongoClient;
//데이터베이스의 데이터 입력,출력을 위한 함수명령어 불러들이는 작업
const app = express();
const port = 3000;

//ejs 태그를 사용하기 위한 세팅
app.set("view engine","ejs");
//사용자가 입력한 데이터값을 주소로 통해서 전달되는 것을 변환(parsing)
app.use(express.urlencoded({extended: true}));
app.use(express.json()) 
//css/img/js(정적인 파일)사용하려면 이코드를 작성!
app.use(express.static('public'));

//데이터 베이스 연결작업
let db; //데이터베이스 연결을 위한 변수세팅(변수의 이름은 자유롭게 지어도 됨)

MongoClient.connect("mongodb+srv://khp2337:cogktkfkd8214@cluster0.kjr1egt.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("ex5");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });

});

app.get("/",function(req,res){
    res.render("index.ejs");
});

//게시글 목록 페이지
app.get("/board/list",(req,res)=>{
   db.collection("board").find().sort({num:-1}).toArray((err,result)=>{
        //게시글 목록 데이터 전부 가지고 와서 목록페이지로 전달
        res.render("brd_list.ejs",{data:result,text:""})
   })
})

//게시글 작성화면 페이지
app.get("/board/insert",(req,res)=>{
    res.render("brd_insert.ejs");
})

//입력한 게시글 데이터 -> db에 저장처리
app.post("/dbinsert",(req,res)=>{
    db.collection("count").findOne({name:"게시물갯수"},(err,countResult)=>{
        db.collection("board").insertOne({
            num:countResult.boardCount,
            title:req.body.title,
            author:req.body.author,
            content:req.body.content
        },(err,result)=>{
            db.collection("count").updateOne({name:"게시물갯수"},{$inc:{boardCount:1}},(err,result)=>{
                res.redirect("/board/detail/"+countResult.boardCount)
                // /board/detil/20
            })
            //게시글 작성완료 후 해당 게시글 번호의 데이터값을 불러와서
            //해당 상세페이지로 이동할 수 있도록 주소에 게시글번호를 뒤에다가 붙여준다
            //      res.redirect("/board/detail/게시글번호값")
            
        })
    })
})

//게시글 상세화면페이지로 요청
app.get("/board/detail/:num",(req,res)=>{

    db.collection("board").findOne({num:Number(req.params.num)},(err,result)=>{
        //find로 찾아온 데이터값은 result에 담긴다
        //상세페이지 보여주기위해서 찾은 데이터값을 함께 전달한다.
        res.render("brd_detail.ejs",{data:result});
    })
})

//게시글 상세화면페이지에서 삭제를 눌렀을 때 요청
// :num 으로 보내준 페이지 번호와  deleteOne 사용시 num 값과 매칭되는 게시글 삭제
app.get("/dbdelete/:num",(req,res)=>{
    db.collection("board").deleteOne({num:Number(req.params.num)},(err,result)=>{
        //게시글 삭제후 게시글 목록페이지로 요청
        res.redirect("/board/list")
    })
})


//체크박스 선택한 게시글들 지우는 처리
app.get("/dbseldel",(req,res)=>{
    //console.log(req.query.delOk)
   //delOk안에있는 문자열 데이터들을 정수데이터로 변경
   let changeNumber = [];
   req.query.delOk.forEach((item,index)=>{
        changeNumber[index] = Number(item); 
        //반복문으로 해당 체크박스 value 값 갯수만큼 숫자로 변환후 배열에 대입
   })

   //변환된 게시글 번호 갯수들만큼 실제 데이터베이스에서 삭제처리 deleteMany()
                                            //배열명에 있는 데이터랑 매칭되는 것들을 삭제
   db.collection("board").deleteMany({num:{$in:changeNumber}},(err,result)=>{
        res.redirect("/board/list"); //게시글 목록페이지로 요청
   })
})


//수정화면 페이지 요청
app.get("/board/update/:num",(req,res)=>{

    db.collection("board").findOne({num:Number(req.params.num)},(err,result)=>{
        //find로 찾아온 데이터값은 result에 담긴다
        //상세페이지 보여주기위해서 찾은 데이터값을 함께 전달한다.
        res.render("brd_update.ejs",{data:result});
    })
})

//데이터베이스 수정요청
app.post("/dbupdate",(req,res)=>{
    db.collection("board").updateOne({num:Number(req.body.num)},{$set:{title:req.body.title,author:req.body.author,content:req.body.content}},(err,result)=>{
        res.redirect(`/board/detail/${req.body.num}`) //데이터베이스 데이터 수정후 게시글 목록페이지로 요청
    })
})


//검색 요청
app.get("/search",(req,res)=>{

    //검색조건 세팅(찾는 단어는 뭐고, 검색결과 갯수 몇개까지?, 순서정렬?)
    let check = [
    {
        $search:{
            //db사이트에서 검색엔진 설정한 이름값
            index:"searchTest",
            text:{
                //검색어 입력단어값
                query:req.query.inputText,
                //어떤항목을 검색할것인지 -> 여러개 설정할 때는 배열로 [] 설정가능 
                path:req.query.search
            }
        }
    },
    {$sort:{num:-1}},
    // {$limit:2}
]

    db.collection("board").aggregate(check).toArray((err,result)=>{
        res.render("brd_list.ejs",{data:result,text:req.query.inputText})
        //검색결과 데이터들만 보내줌
    })
})



