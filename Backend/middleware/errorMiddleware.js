const handleError = (err,req,res,next) => {
    let statusCode = err.statusCode || err.status;
    if (!statusCode || statusCode === 200) {
        statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    }
    return res.status(statusCode).json({'message':err.message});
};

const notFound = (req,res,next) => {
    const method = req.method;
    const path = req.path; 
    
    return res.status(404).json({message:`Api with ${method}\\${path} not Found`});
}

export {handleError,notFound};