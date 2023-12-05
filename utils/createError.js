
const createError = (status , msg) => {

    const error = new Error()

    error.message = msg
    error.status = status

    return error
}


module.exports = createError