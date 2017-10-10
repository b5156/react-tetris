/**
 * Created by aaron on 2017/8/22.
 */

/**
 * 去除数组中重复的元素
 * @param arr
 * @returns []
 */
export function uniqueArr(arr) {
    if (arr.length < 2) return arr;
    //
    arr.sort();
    let arr2 = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] !== arr2[arr2.length - 1]) {
            arr2.push(arr[i]);
        }
    }
    return arr2;
}
