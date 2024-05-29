export class Logger {

    static get LEVEL_DEBUG()
    {
        return 1;
    };

    static get LEVEL_INFO()
    {
        return 2;
    };

    static get LEVEL_WARN()
    {
        return 3;
    };

    static get LEVEL_ERROR()
    {
        return 4;
    };

    static get DEFAULT_LOG_LEVEL()
    {
        return "warn";
    }

    /**
     * Initialize a logger instance with the given log level.
     * If a class initializes a logger instance without specifying a log level,
     * it will fall back to the global LOG_LEVEL environment variable and if that is not set either,
     * it will fall back to the default log level (WARN).
     */
    constructor( loggerName, logLevel )
    {
        this.loggerName = loggerName;
        this.logLevel = logLevel
            ? Logger.getLogLevelForName( logLevel )
            : ( Logger.getLogLevelForName( process.env.LOG_LEVEL ) || Logger.getLogLevelForName( Logger.DEFAULT_LOG_LEVEL ) );
    }

    debug( message )
    {
        if ( !this.checkLogLevel( Logger.LEVEL_DEBUG ) )
        {
            return;
        }
        console.debug( this.addPrefix( message ) );
    }

    info( message )
    {
        if ( !this.checkLogLevel( Logger.LEVEL_INFO ) )
        {
            return;
        }
        console.info( this.addPrefix( message ) );
    }

    warn( message )
    {
        if ( !this.checkLogLevel( Logger.LEVEL_WARN ) )
        {
            return;
        }
        console.warn( this.addPrefix( message ) );
    }

    error( message )
    {
        if ( !this.checkLogLevel( Logger.LEVEL_ERROR ) )
        {
            return;
        }
        console.error( this.addPrefix( message ) );
    }

    addPrefix( message )
    {
        return `[${this.loggerName}] ${message}`;
    }

    checkLogLevel( sev )
    {
        return sev >= this.logLevel;
    }

    static getLogLevelForName( name )
    {

        if ( !name )
        {
            return;
        }

        switch ( name.toLowerCase() )
        {
            case "debug":
                return Logger.LEVEL_DEBUG;
            case "info":
                return Logger.LEVEL_INFO;
            case "warn":
                return Logger.LEVEL_WARN;
            case "error":
                return Logger.LEVEL_ERROR;
            default:
                return Logger.DEFAULT_LOG_LEVEL;
        }
    }
}