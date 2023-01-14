const tryTimes = async <V>(fnGetter: () => Promise<V>, times: number, retryDelay: number): Promise<V> => {
    while (times-- > 0) {
        console.log(times);
        try {
            return await fnGetter();
        } catch (error) {
            console.log(error.stack);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    throw new Error('Failed to execute function');
};

export {
    tryTimes
}
