export function remove0x(str) {
    if (str.startsWith("0x")) {
        return str.slice(2);
    } else {
        return str;
    }
}

export function isNull(str) {
    if (str === "") return true;
    if (JSON.stringify(str) === "{}") return true;
    var regu = "^[ ]+$";
    var re = new RegExp(regu);
    return re.test(str);
}

export function addOx(str) {
    if (str.startsWith("0x")) {
        return str;
    } else {
        return "0x" + str;
    }
}
