const Post = require("../models/Post");
const User = require("../models/User");
const { success, error } = require("../utils/responseWrapper");
const { mapPostOutput } = require("../utils/Utils");
const cloudinary = require('cloudinary').v2;



 
//CREATE POST API
const createPostController = async (req, res) => {
  try {
    const { caption,postImg } = req.body; //get the caption from front end

    if(!caption || !postImg){
      return res.send(error(400,'Caption and postImg are required'))
    }
   
    const cloudImg = await cloudinary.uploader.upload(postImg, {
      folder : 'postImg'
    })

    const owner = req._id; //This will come from requireUser.js middleware  to all the api's
    const user = await User.findById(req._id); //adding the post created to the user schema also

    //creating post
    const post = await Post.create({
      owner,
      caption,
      image:{
        publicId:cloudImg.public_id ,
        url: cloudImg.url
      }
    });

    user.posts.push(post._id); //pushing the post(every post will get an id) to the user schema
    await user.save(); //saving the mongoosedb
    return res.json(success(200, {post})); //send the post back to user once created.
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message)); // sending internal server error
  }
};


//LIKE AND UNLIKE POST API
const likeAndUnlikePost = async (req, res) => {
  try {
    const { postId } = req.body; //get the post id from the post that you want to like/unlike
    const curUserId = req._id; //current user id

    const post = await Post.findById(postId).populate('owner'); //based on the postID find that post from post schema
    if (!post) {
      //if post not present in db
      return res.send(error(404, "Post not found"));
    }

    //UNLIKE POST
    //if post already liked(have the current user id inside the likes array of post table,means user has already liked it) => code to Unlike the post
    if (post.likes.includes(curUserId)) {
      const index = post.likes.indexOf(curUserId); //get the index of cur user id in likes of post table
      post.likes.splice(index, 1); //remove the user from the likes..means the post is unliked. Splice => used to remove elemnt from between the array
      // await post.save(); //save to mongodb
      // return res.send(success(200, "Post unliked"));
    }
    //LIKE POST
    else {
      post.likes.push(curUserId); //like the post => adding current user id to likes array in post
      // await post.save();
      // res.send(success(200, "Post Liked"));
    }
    await post.save();
    return res.send(success(200, {post : mapPostOutput(post,req._id)}));
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message)); // sending internal server error
  }
};



//UPDATE POSTS
const updatePostController  = async(req,res)=>{

  try {
    const {postId,caption} = req.body;
    const curUserId = req._id
  
    //check if the post to update is present
    const post = await Post.findById(postId);
    if(!post){
      return res.send(error(404,"Post not found"))
    }

    // you should not be alowed to update other peoples post. we get owner id as an object hence converting to string before comparing to see if you are the owner of the post
    if(post.owner.toString() !== curUserId ){
      return res.send(error(403,"Only the owners can update their post"))
    }

//updating the caption
if(caption){
  post.caption = caption
}

await post.save();
return res.send(success(200,{post}))

  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message)); // sending internal server error
  }
 
}


//DELETE POST
const deletePost = async(req,res)=>{

  try {
    const {postId} = req.body;
  const curUserId = req._id;

 const post = await Post.findById(postId);
 const curUser = await User.findById(curUserId)

    if(!post){
      return res.send(error(404,"Post not found"))
    }
 
    if(post.owner.toString() !== curUserId ){
      return res.send(error(403,"Only the owners can delete their post"))
    }

    const index=curUser.posts.indexOf(postId);
    curUser.posts.splice(index,1)
    await curUser.save();
   await post.remove();
    
   return res.send(success(200,'post deleted successfully'))
  } catch (e) {
    console.log(e);
    return res.send(error(500, e.message)); // sending internal server error
  }
  
}



module.exports = {
 
  createPostController,
  likeAndUnlikePost,
  updatePostController,
  deletePost
};



