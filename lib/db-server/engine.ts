import { DatabaseData, TableData, QueryResult, ExecutionPlanNode, DataType, ColumnDefinition } from './types';
import { INITIAL_DATABASES } from './seed-data';

export class DatabaseEngine {
  private databases: Record<string, DatabaseData>;
  private defaultDbName: string = 'aetherdb';

  constructor(initialData?: Record<string, DatabaseData>) {
    if (initialData) {
      this.databases = JSON.parse(JSON.stringify(initialData));
    } else {
      this.databases = JSON.parse(JSON.stringify(INITIAL_DATABASES));
    }
  }

  public getDatabases(): string[] {
    return Object.keys(this.databases);
  }

  public getDatabase(name: string): DatabaseData | undefined {
    return this.databases[name];
  }

  public getAllDatabases(): Record<string, DatabaseData> {
    return this.databases;
  }

  public createDatabase(name: string, owner?: string): boolean {
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanName || this.databases[cleanName]) return false;

    this.databases[cleanName] = {
      name: cleanName,
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      sizeBytes: 1024 * 64,
      tables: {},
      createdAt: new Date().toISOString(),
      owner: owner || 'system'
    };
    return true;
  }

  public dropDatabase(name: string): boolean {
    if (!this.databases[name]) return false;
    delete this.databases[name];
    if (this.defaultDbName === name) {
      const remaining = Object.keys(this.databases);
      this.defaultDbName = remaining[0] || '';
    }
    return true;
  }

  public getTable(dbName: string, tableName: string): TableData | undefined {
    const db = this.databases[dbName];
    if (!db) return undefined;
    return db.tables[tableName];
  }

  public insertRow(dbName: string, tableName: string, rowData: Record<string, any>): Record<string, any> {
    const table = this.getTable(dbName, tableName);
    if (!table) throw new Error(`Table ${tableName} does not exist in ${dbName}`);

    const newRow: Record<string, any> = { ...rowData };
    const pkCol = table.schema.columns.find(c => c.primaryKey);

    if (pkCol && (newRow[pkCol.name] === undefined || newRow[pkCol.name] === null)) {
      newRow[pkCol.name] = table.autoIncrementCurrent++;
    }

    // Apply defaults and validate
    for (const col of table.schema.columns) {
      if (newRow[col.name] === undefined && col.defaultValue !== undefined) {
        newRow[col.name] = col.defaultValue;
      }
      if (col.type === 'TIMESTAMP' && !newRow[col.name]) {
        newRow[col.name] = new Date().toISOString().replace('T', ' ').substring(0, 19);
      }
    }

    table.rows.push(newRow);
    return newRow;
  }

  public updateRow(dbName: string, tableName: string, id: any, updates: Record<string, any>): boolean {
    const table = this.getTable(dbName, tableName);
    if (!table) return false;

    const pkCol = table.schema.columns.find(c => c.primaryKey) || table.schema.columns[0];
    const index = table.rows.findIndex(r => String(r[pkCol.name]) === String(id));
    if (index === -1) return false;

    table.rows[index] = { ...table.rows[index], ...updates };
    return true;
  }

  public deleteRow(dbName: string, tableName: string, id: any): boolean {
    const table = this.getTable(dbName, tableName);
    if (!table) return false;

    const pkCol = table.schema.columns.find(c => c.primaryKey) || table.schema.columns[0];
    const initialLen = table.rows.length;
    table.rows = table.rows.filter(r => String(r[pkCol.name]) !== String(id));
    return table.rows.length < initialLen;
  }

  public executeSQL(rawSql: string, activeDbName?: string): QueryResult {
    const startTime = performance.now();
    const targetDbName = activeDbName || this.defaultDbName;
    const trimmed = rawSql.trim();

    if (!trimmed) {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        command: 'EMPTY',
        error: 'Empty query provided'
      };
    }

    try {
      const upper = trimmed.toUpperCase();

      // EXPLAIN ANALYZE
      if (upper.startsWith('EXPLAIN ANALYZE') || upper.startsWith('EXPLAIN')) {
        const queryToExplain = trimmed.replace(/^EXPLAIN(\s+ANALYZE)?/i, '').trim();
        const baseResult = this.executeSQL(queryToExplain, targetDbName);
        const plan: ExecutionPlanNode = {
          operation: 'Query Execution Plan',
          details: `Target DB: ${targetDbName} | Statement: ${baseResult.command}`,
          estimatedRows: Math.max(1, baseResult.rowCount * 2),
          actualRows: baseResult.rowCount,
          costEstimate: parseFloat((0.05 + baseResult.rowCount * 0.02).toFixed(2)),
          actualTimeMs: parseFloat(baseResult.executionTimeMs.toFixed(3)),
          children: [
            {
              operation: baseResult.command.includes('JOIN') ? 'Hash Join / Nested Loop' : 'Sequential Scan',
              details: `Filter & Buffer Cache Check on ${targetDbName}`,
              estimatedRows: baseResult.rowCount,
              actualRows: baseResult.rowCount,
              costEstimate: 0.12,
              actualTimeMs: parseFloat((baseResult.executionTimeMs * 0.7).toFixed(3))
            },
            {
              operation: 'Index Lookup / Projection',
              details: `Columns: ${baseResult.columns.join(', ') || '*'}`,
              estimatedRows: baseResult.rowCount,
              actualRows: baseResult.rowCount,
              costEstimate: 0.04,
              actualTimeMs: parseFloat((baseResult.executionTimeMs * 0.3).toFixed(3))
            }
          ]
        };

        return {
          ...baseResult,
          command: 'EXPLAIN ANALYZE',
          plan,
          executionTimeMs: performance.now() - startTime
        };
      }

      // SHOW DATABASES
      if (/^SHOW\s+DATABASES/i.test(trimmed)) {
        const dbs = this.getDatabases().map(name => ({
          Database: name,
          Tables: Object.keys(this.databases[name]?.tables || {}).length,
          Size: `${(this.databases[name]?.sizeBytes / (1024 * 1024)).toFixed(2)} MB`
        }));
        return {
          success: true,
          columns: ['Database', 'Tables', 'Size'],
          rows: dbs,
          rowCount: dbs.length,
          executionTimeMs: performance.now() - startTime,
          command: 'SHOW DATABASES'
        };
      }

      // SHOW TABLES
      if (/^SHOW\s+TABLES/i.test(trimmed)) {
        const db = this.databases[targetDbName];
        if (!db) throw new Error(`Database ${targetDbName} does not exist`);
        const tables = Object.keys(db.tables).map(t => ({
          TableName: t,
          Columns: db.tables[t].schema.columns.length,
          Rows: db.tables[t].rows.length,
          Created: db.tables[t].schema.createdAt.substring(0, 10)
        }));
        return {
          success: true,
          columns: ['TableName', 'Columns', 'Rows', 'Created'],
          rows: tables,
          rowCount: tables.length,
          executionTimeMs: performance.now() - startTime,
          command: 'SHOW TABLES'
        };
      }

      // DESCRIBE / DESC table
      const descMatch = trimmed.match(/^(?:DESCRIBE|DESC)\s+([a-zA-Z0-9_]+)/i);
      if (descMatch) {
        const tableName = descMatch[1];
        const db = this.databases[targetDbName];
        if (!db) throw new Error(`Database ${targetDbName} does not exist`);
        const table = db.tables[tableName];
        if (!table) throw new Error(`Table '${tableName}' not found in database '${targetDbName}'`);

        const rows = table.schema.columns.map(col => ({
          Field: col.name,
          Type: col.type,
          Null: col.nullable !== false ? 'YES' : 'NO',
          Key: col.primaryKey ? 'PRI' : col.unique ? 'UNI' : '',
          Default: col.defaultValue !== undefined ? String(col.defaultValue) : 'NULL',
          Extra: col.primaryKey ? 'auto_increment' : ''
        }));

        return {
          success: true,
          columns: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'],
          rows,
          rowCount: rows.length,
          executionTimeMs: performance.now() - startTime,
          command: 'DESCRIBE'
        };
      }

      // CREATE DATABASE
      const createDbMatch = trimmed.match(/^CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (createDbMatch) {
        const dbName = createDbMatch[1];
        const created = this.createDatabase(dbName);
        return {
          success: true,
          columns: ['Status'],
          rows: [{ Status: created ? `Database '${dbName}' created successfully` : `Database '${dbName}' already exists` }],
          rowCount: created ? 1 : 0,
          executionTimeMs: performance.now() - startTime,
          command: 'CREATE DATABASE'
        };
      }

      // DROP DATABASE
      const dropDbMatch = trimmed.match(/^DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (dropDbMatch) {
        const dbName = dropDbMatch[1];
        const dropped = this.dropDatabase(dbName);
        return {
          success: true,
          columns: ['Status'],
          rows: [{ Status: dropped ? `Database '${dbName}' dropped` : `Database '${dbName}' does not exist` }],
          rowCount: dropped ? 1 : 0,
          executionTimeMs: performance.now() - startTime,
          command: 'DROP DATABASE'
        };
      }

      // CREATE TABLE
      if (upper.startsWith('CREATE TABLE')) {
        return this.handleCreateTable(trimmed, targetDbName, startTime);
      }

      // DROP TABLE
      const dropTableMatch = trimmed.match(/^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (dropTableMatch) {
        const tableName = dropTableMatch[1];
        const db = this.databases[targetDbName];
        if (!db) throw new Error(`Database ${targetDbName} not found`);
        if (db.tables[tableName]) {
          delete db.tables[tableName];
          return {
            success: true,
            columns: ['Status'],
            rows: [{ Status: `Table '${tableName}' dropped successfully` }],
            rowCount: 1,
            executionTimeMs: performance.now() - startTime,
            command: 'DROP TABLE'
          };
        } else {
          return {
            success: true,
            columns: ['Status'],
            rows: [{ Status: `Table '${tableName}' does not exist` }],
            rowCount: 0,
            executionTimeMs: performance.now() - startTime,
            command: 'DROP TABLE'
          };
        }
      }

      // TRUNCATE TABLE
      const truncateMatch = trimmed.match(/^TRUNCATE\s+(?:TABLE\s+)?([a-zA-Z0-9_]+)/i);
      if (truncateMatch) {
        const tableName = truncateMatch[1];
        const db = this.databases[targetDbName];
        if (!db) throw new Error(`Database ${targetDbName} not found`);
        if (!db.tables[tableName]) throw new Error(`Table '${tableName}' not found`);
        db.tables[tableName].rows = [];
        db.tables[tableName].autoIncrementCurrent = 1;
        return {
          success: true,
          columns: ['Status'],
          rows: [{ Status: `Table '${tableName}' truncated (0 rows remain)` }],
          rowCount: 1,
          executionTimeMs: performance.now() - startTime,
          command: 'TRUNCATE'
        };
      }

      // INSERT INTO
      if (upper.startsWith('INSERT INTO')) {
        return this.handleInsert(trimmed, targetDbName, startTime);
      }

      // UPDATE
      if (upper.startsWith('UPDATE')) {
        return this.handleUpdate(trimmed, targetDbName, startTime);
      }

      // DELETE FROM
      if (upper.startsWith('DELETE FROM')) {
        return this.handleDelete(trimmed, targetDbName, startTime);
      }

      // SELECT
      if (upper.startsWith('SELECT')) {
        return this.handleSelect(trimmed, targetDbName, startTime);
      }

      throw new Error(`Unsupported SQL syntax. Supported statements: SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, DROP TABLE, TRUNCATE, SHOW DATABASES, SHOW TABLES, DESCRIBE, EXPLAIN ANALYZE.`);
    } catch (err: any) {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: performance.now() - startTime,
        command: 'ERROR',
        error: err.message || 'Execution failed'
      };
    }
  }

  private handleCreateTable(sql: string, dbName: string, startTime: number): QueryResult {
    const db = this.databases[dbName];
    if (!db) throw new Error(`Database '${dbName}' not found`);

    const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]+)\)/i);
    if (!match) throw new Error(`Invalid CREATE TABLE syntax. Example: CREATE TABLE users (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL)`);

    const tableName = match[1];
    const columnDefinitionsStr = match[2];

    if (db.tables[tableName]) {
      return {
        success: true,
        columns: ['Status'],
        rows: [{ Status: `Table '${tableName}' already exists` }],
        rowCount: 0,
        executionTimeMs: performance.now() - startTime,
        command: 'CREATE TABLE'
      };
    }

    const columnDefs: ColumnDefinition[] = [];
    const parts = columnDefinitionsStr.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
      // e.g., "id INTEGER PRIMARY KEY" or "email VARCHAR NOT NULL UNIQUE"
      const colTokens = part.split(/\s+/);
      if (colTokens.length < 2) continue;

      const colName = colTokens[0].replace(/[`"]/g, '');
      const rawType = colTokens[1].toUpperCase();

      let type: DataType = 'VARCHAR';
      if (rawType.includes('INT') || rawType.includes('SERIAL')) type = 'INTEGER';
      else if (rawType.includes('DECIMAL') || rawType.includes('FLOAT') || rawType.includes('DOUBLE') || rawType.includes('NUMERIC')) type = 'DECIMAL';
      else if (rawType.includes('BOOL')) type = 'BOOLEAN';
      else if (rawType.includes('TIME') || rawType.includes('DATE')) type = 'TIMESTAMP';
      else if (rawType.includes('JSON')) type = 'JSON';

      const upperPart = part.toUpperCase();
      const primaryKey = upperPart.includes('PRIMARY KEY');
      const nullable = !upperPart.includes('NOT NULL');
      const unique = upperPart.includes('UNIQUE');

      columnDefs.push({
        name: colName,
        type,
        primaryKey,
        nullable,
        unique
      });
    }

    db.tables[tableName] = {
      schema: {
        name: tableName,
        createdAt: new Date().toISOString(),
        columns: columnDefs,
        indexes: columnDefs.filter(c => c.primaryKey || c.unique).map(c => `idx_${tableName}_${c.name}`)
      },
      rows: [],
      autoIncrementCurrent: 1
    };

    return {
      success: true,
      columns: ['Status'],
      rows: [{ Status: `Table '${tableName}' created with ${columnDefs.length} columns.` }],
      rowCount: 1,
      executionTimeMs: performance.now() - startTime,
      command: 'CREATE TABLE'
    };
  }

  private handleInsert(sql: string, dbName: string, startTime: number): QueryResult {
    const db = this.databases[dbName];
    if (!db) throw new Error(`Database '${dbName}' not found`);

    const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([\s\S]+)\)/i);
    if (!match) throw new Error(`Invalid INSERT syntax. Example: INSERT INTO customers (full_name, email) VALUES ('Alex Vance', 'alex@example.com')`);

    const tableName = match[1];
    const columnsStr = match[2];
    const valuesStr = match[3];

    const table = db.tables[tableName];
    if (!table) throw new Error(`Table '${tableName}' not found in database '${dbName}'`);

    const specifiedCols = columnsStr
      ? columnsStr.split(',').map(c => c.trim().replace(/[`"]/g, ''))
      : table.schema.columns.map(c => c.name);

    // Parse values honoring quotes
    const parsedValues = this.parseCsvValues(valuesStr);

    const rowObj: Record<string, any> = {};
    for (let i = 0; i < specifiedCols.length; i++) {
      const colName = specifiedCols[i];
      const val = parsedValues[i];
      const colDef = table.schema.columns.find(c => c.name === colName);

      if (colDef) {
        rowObj[colName] = this.castValue(val, colDef.type);
      } else {
        rowObj[colName] = val;
      }
    }

    this.insertRow(dbName, tableName, rowObj);

    return {
      success: true,
      columns: ['RowsAffected'],
      rows: [{ RowsAffected: 1 }],
      rowCount: 1,
      executionTimeMs: performance.now() - startTime,
      command: 'INSERT',
      message: '1 row inserted successfully'
    };
  }

  private handleUpdate(sql: string, dbName: string, startTime: number): QueryResult {
    const db = this.databases[dbName];
    if (!db) throw new Error(`Database '${dbName}' not found`);

    const match = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (!match) throw new Error(`Invalid UPDATE syntax. Example: UPDATE customers SET balance = 500 WHERE id = 1`);

    const tableName = match[1];
    const setClause = match[2];
    const whereClause = match[3];

    const table = db.tables[tableName];
    if (!table) throw new Error(`Table '${tableName}' not found in database '${dbName}'`);

    // Parse SET clauses
    const assignments: Record<string, any> = {};
    const setParts = setClause.split(',').map(s => s.trim());
    for (const part of setParts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx !== -1) {
        const col = part.substring(0, eqIdx).trim().replace(/[`"]/g, '');
        const rawVal = part.substring(eqIdx + 1).trim();
        const colDef = table.schema.columns.find(c => c.name === col);
        const cleanedVal = rawVal.replace(/^'|'$/g, '').replace(/^"|"$/g, '');
        assignments[col] = colDef ? this.castValue(cleanedVal, colDef.type) : cleanedVal;
      }
    }

    let affected = 0;
    for (const row of table.rows) {
      if (!whereClause || this.evaluateWhere(row, whereClause)) {
        Object.assign(row, assignments);
        affected++;
      }
    }

    return {
      success: true,
      columns: ['RowsUpdated'],
      rows: [{ RowsUpdated: affected }],
      rowCount: affected,
      executionTimeMs: performance.now() - startTime,
      command: 'UPDATE',
      message: `${affected} row(s) updated successfully`
    };
  }

  private handleDelete(sql: string, dbName: string, startTime: number): QueryResult {
    const db = this.databases[dbName];
    if (!db) throw new Error(`Database '${dbName}' not found`);

    const match = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (!match) throw new Error(`Invalid DELETE syntax. Example: DELETE FROM customers WHERE id = 5`);

    const tableName = match[1];
    const whereClause = match[2];

    const table = db.tables[tableName];
    if (!table) throw new Error(`Table '${tableName}' not found in database '${dbName}'`);

    const initialCount = table.rows.length;
    if (!whereClause) {
      table.rows = [];
    } else {
      table.rows = table.rows.filter(row => !this.evaluateWhere(row, whereClause));
    }
    const deleted = initialCount - table.rows.length;

    return {
      success: true,
      columns: ['RowsDeleted'],
      rows: [{ RowsDeleted: deleted }],
      rowCount: deleted,
      executionTimeMs: performance.now() - startTime,
      command: 'DELETE',
      message: `${deleted} row(s) deleted successfully`
    };
  }

  private handleSelect(sql: string, dbName: string, startTime: number): QueryResult {
    const db = this.databases[dbName];
    if (!db) throw new Error(`Database '${dbName}' not found`);

    // Syntax: SELECT ... FROM table [JOIN table2 ON ...] [WHERE ...] [GROUP BY ...] [ORDER BY ...] [LIMIT n [OFFSET m]]
    const selectRegex = /SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+(?:(LEFT|INNER|RIGHT)?\s*JOIN\s+([a-zA-Z0-9_]+)\s+ON\s+([\s\S]+?)))?(?:\s+WHERE\s+([\s\S]+?))?(?:\s+GROUP\s+BY\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([\s\S]+?))?(?:\s+LIMIT\s+([0-9]+))?(?:\s+OFFSET\s+([0-9]+))?$/i;

    const match = sql.match(selectRegex);
    if (!match) {
      // Fallback simple match if complex regex fails
      return this.handleSimpleSelect(sql, db, startTime);
    }

    const selectColsStr = match[1].trim();
    const primaryTable = match[2].trim();
    const joinType = match[3] || 'INNER';
    const joinTable = match[4]?.trim();
    const joinCondition = match[5]?.trim();
    const whereClause = match[6]?.trim();
    const groupByClause = match[7]?.trim();
    const orderByClause = match[8]?.trim();
    const limitClause = match[9]?.trim();
    const offsetClause = match[10]?.trim();

    const t1 = db.tables[primaryTable];
    if (!t1) throw new Error(`Table '${primaryTable}' not found in database '${dbName}'`);

    let workingRows: Record<string, any>[] = [];

    // Join resolution
    if (joinTable && joinCondition) {
      const t2 = db.tables[joinTable];
      if (!t2) throw new Error(`Table '${joinTable}' not found in database '${dbName}'`);

      const [leftSide, rightSide] = joinCondition.split('=').map(s => s.trim());
      const leftCol = leftSide.includes('.') ? leftSide.split('.')[1] : leftSide;
      const rightCol = rightSide.includes('.') ? rightSide.split('.')[1] : rightSide;

      for (const r1 of t1.rows) {
        let matched = false;
        for (const r2 of t2.rows) {
          const v1 = r1[leftCol] !== undefined ? r1[leftCol] : r1[rightCol];
          const v2 = r2[rightCol] !== undefined ? r2[rightCol] : r2[leftCol];

          if (String(v1) === String(v2)) {
            matched = true;
            const combined: Record<string, any> = {};
            for (const k in r1) combined[`${primaryTable}.${k}`] = r1[k];
            for (const k in r2) combined[`${joinTable}.${k}`] = r2[k];
            // Also expose bare names if no collision
            for (const k in r1) if (!combined[k]) combined[k] = r1[k];
            for (const k in r2) if (!combined[k]) combined[k] = r2[k];
            workingRows.push(combined);
          }
        }
        if (!matched && joinType.toUpperCase() === 'LEFT') {
          const combined: Record<string, any> = {};
          for (const k in r1) combined[`${primaryTable}.${k}`] = r1[k];
          for (const k of t2.schema.columns) combined[`${joinTable}.${k.name}`] = null;
          for (const k in r1) if (!combined[k]) combined[k] = r1[k];
          workingRows.push(combined);
        }
      }
    } else {
      workingRows = t1.rows.map(r => ({ ...r }));
    }

    // WHERE filtering
    if (whereClause) {
      workingRows = workingRows.filter(row => this.evaluateWhere(row, whereClause));
    }

    // Aggregates & GROUP BY handling
    const isAggregate = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(selectColsStr);
    let finalRows: Record<string, any>[] = [];
    let outputColumns: string[] = [];

    if (isAggregate) {
      const aggMatch = selectColsStr.match(/(COUNT|SUM|AVG|MIN|MAX)\s*\(([^)]+)\)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/i);
      const aggFunc = aggMatch ? aggMatch[1].toUpperCase() : 'COUNT';
      const aggCol = aggMatch ? aggMatch[2].trim().replace(/[`"]/g, '') : '*';
      const aggAlias = (aggMatch && aggMatch[3]) || `${aggFunc.toLowerCase()}_result`;

      if (groupByClause) {
        const groupCol = groupByClause.trim().replace(/[`"]/g, '');
        const groups: Record<string, any[]> = {};
        for (const row of workingRows) {
          const key = String(row[groupCol] ?? 'NULL');
          if (!groups[key]) groups[key] = [];
          groups[key].push(row);
        }

        outputColumns = [groupCol, aggAlias];
        for (const key in groups) {
          const rowsInGroup = groups[key];
          const val = this.computeAggregate(aggFunc, aggCol, rowsInGroup);
          finalRows.push({
            [groupCol]: rowsInGroup[0][groupCol],
            [aggAlias]: val
          });
        }
      } else {
        outputColumns = [aggAlias];
        const val = this.computeAggregate(aggFunc, aggCol, workingRows);
        finalRows = [{ [aggAlias]: val }];
      }
    } else if (selectColsStr === '*') {
      if (workingRows.length > 0) {
        // filter out prefixed keys if bare keys exist
        outputColumns = Object.keys(workingRows[0]).filter(k => !k.includes('.'));
        if (outputColumns.length === 0) outputColumns = Object.keys(workingRows[0]);
      } else {
        outputColumns = t1.schema.columns.map(c => c.name);
      }
      finalRows = workingRows;
    } else {
      // Specific columns
      const requested = selectColsStr.split(',').map(s => s.trim().replace(/[`"]/g, ''));
      outputColumns = requested;
      finalRows = workingRows.map(row => {
        const projection: Record<string, any> = {};
        for (const col of requested) {
          // alias check e.g. "col AS alias"
          const aliasParts = col.split(/\s+AS\s+/i);
          const rawCol = aliasParts[0].trim();
          const targetKey = aliasParts[1] ? aliasParts[1].trim() : rawCol;
          projection[targetKey] = row[rawCol] !== undefined ? row[rawCol] : (row[`${primaryTable}.${rawCol}`] ?? null);
        }
        return projection;
      });
    }

    // ORDER BY
    if (orderByClause) {
      const orderParts = orderByClause.trim().split(/\s+/);
      const orderCol = orderParts[0].replace(/[`"]/g, '');
      const orderDir = (orderParts[1] || 'ASC').toUpperCase();

      finalRows.sort((a, b) => {
        const valA = a[orderCol];
        const valB = b[orderCol];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        const result = valA < valB ? -1 : 1;
        return orderDir === 'DESC' ? -result : result;
      });
    }

    // OFFSET & LIMIT
    const offset = offsetClause ? parseInt(offsetClause, 10) : 0;
    if (offset > 0) {
      finalRows = finalRows.slice(offset);
    }
    if (limitClause) {
      const limit = parseInt(limitClause, 10);
      finalRows = finalRows.slice(0, limit);
    }

    return {
      success: true,
      columns: outputColumns,
      rows: finalRows,
      rowCount: finalRows.length,
      executionTimeMs: performance.now() - startTime,
      command: 'SELECT'
    };
  }

  private handleSimpleSelect(sql: string, db: DatabaseData, startTime: number): QueryResult {
    // Very simple fallback: SELECT * FROM table
    const match = sql.match(/SELECT\s+(.*?)\s+FROM\s+([a-zA-Z0-9_]+)/i);
    if (!match) throw new Error(`Syntax error in query: ${sql}`);

    const tableName = match[2];
    const table = db.tables[tableName];
    if (!table) throw new Error(`Table '${tableName}' not found`);

    return {
      success: true,
      columns: table.schema.columns.map(c => c.name),
      rows: table.rows,
      rowCount: table.rows.length,
      executionTimeMs: performance.now() - startTime,
      command: 'SELECT'
    };
  }

  private evaluateWhere(row: Record<string, any>, whereClause: string): boolean {
    // Basic parser for WHERE condition (handles AND/OR and comparison operators)
    const orParts = whereClause.split(/\s+OR\s+/i);
    if (orParts.length > 1) {
      return orParts.some(p => this.evaluateWhere(row, p));
    }

    const andParts = whereClause.split(/\s+AND\s+/i);
    for (const part of andParts) {
      if (!this.evaluateCondition(row, part.trim())) return false;
    }
    return true;
  }

  private evaluateCondition(row: Record<string, any>, cond: string): boolean {
    // Matches: col = val, col != val, col > val, col < val, col >= val, col <= val, col LIKE val, col IS NULL, col IS NOT NULL
    const nullMatch = cond.match(/^([a-zA-Z0-9_.]+)\s+IS\s+(NOT\s+)?NULL$/i);
    if (nullMatch) {
      const col = nullMatch[1].replace(/[`"]/g, '');
      const isNot = !!nullMatch[2];
      const val = this.getRowValue(row, col);
      return isNot ? val !== null && val !== undefined : val === null || val === undefined;
    }

    const compMatch = cond.match(/^([a-zA-Z0-9_.]+)\s*(=|!=|<>|>=|<=|>|<|LIKE|ILIKE)\s*(.+)$/i);
    if (!compMatch) return true;

    const col = compMatch[1].replace(/[`"]/g, '');
    const op = compMatch[2].toUpperCase();
    let target = compMatch[3].trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '');

    const actual = this.getRowValue(row, col);

    if (op === '=' ) return String(actual).toLowerCase() === target.toLowerCase();
    if (op === '!=' || op === '<>') return String(actual).toLowerCase() !== target.toLowerCase();
    if (op === 'LIKE' || op === 'ILIKE') {
      const regexStr = '^' + target.replace(/%/g, '.*').replace(/_/g, '.') + '$';
      const rx = new RegExp(regexStr, 'i');
      return rx.test(String(actual));
    }

    const numActual = parseFloat(actual);
    const numTarget = parseFloat(target);
    if (!isNaN(numActual) && !isNaN(numTarget)) {
      if (op === '>') return numActual > numTarget;
      if (op === '<') return numActual < numTarget;
      if (op === '>=') return numActual >= numTarget;
      if (op === '<=') return numActual <= numTarget;
    }

    return false;
  }

  private getRowValue(row: Record<string, any>, col: string): any {
    if (row[col] !== undefined) return row[col];
    if (col.includes('.')) {
      const bare = col.split('.')[1];
      if (row[bare] !== undefined) return row[bare];
    }
    return null;
  }

  private computeAggregate(func: string, col: string, rows: Record<string, any>[]): number {
    if (func === 'COUNT') return rows.length;
    if (rows.length === 0) return 0;

    const values = rows
      .map(r => parseFloat(this.getRowValue(r, col)))
      .filter(v => !isNaN(v));

    if (values.length === 0) return 0;

    if (func === 'SUM') {
      return parseFloat(values.reduce((a, b) => a + b, 0).toFixed(2));
    }
    if (func === 'AVG') {
      const sum = values.reduce((a, b) => a + b, 0);
      return parseFloat((sum / values.length).toFixed(2));
    }
    if (func === 'MIN') return Math.min(...values);
    if (func === 'MAX') return Math.max(...values);
    return 0;
  }

  private parseCsvValues(valuesStr: string): string[] {
    const results: string[] = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      if ((char === "'" || char === '"') && (i === 0 || valuesStr[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuote = false;
        } else {
          current += char;
        }
      } else if (char === ',' && !inQuote) {
        results.push(current.trim().replace(/^['"]|['"]$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim().length > 0) {
      results.push(current.trim().replace(/^['"]|['"]$/g, ''));
    }
    return results;
  }

  private castValue(val: string, type: DataType): any {
    if (val === 'NULL' || val === null || val === undefined) return null;
    if (type === 'INTEGER') return parseInt(val, 10) || 0;
    if (type === 'DECIMAL') return parseFloat(val) || 0.0;
    if (type === 'BOOLEAN') return val === 'true' || val === '1' || val === 'TRUE';
    if (type === 'JSON') {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return String(val);
  }
}
