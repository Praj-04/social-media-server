var ta = require('time-ago')

//organising each post in the below format before sending to frontend from server..
const mapPostOutput = (post,userId) =>{
return {
    _id:post._id,
    caption:post.caption,
    image:post.image,
    owner:{
        _id:post.owner._id,
        name:post.owner.name,
        avatar:post.owner.avatar
    },
    likesCount : post.likes.length, //likes is an array..you can find how many people liked the post
    isLiked: post.likes.includes(userId), //if the person who has logged in,if his id is present in likes..then he has liked the other user post
timeAgo:ta.ago(post.createdAt)
}
}

module.exports ={mapPostOutput} ;