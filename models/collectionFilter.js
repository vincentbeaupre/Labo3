import HttpContext from "../httpContext.js";

class CollectionFilter {
  constructor() {
    this.queryParams = HttpContext.get().path.params;
  }

  static valueMatch(value, searchValue) {
    try {
      let exp = '^' + searchValue.toLowerCase().replace(/\*/g, '.*') + '$';
      return new RegExp(exp).test(value.toString().toLowerCase());
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  static filter(data, field, value) {
    return data.filter(item => CollectionFilter.valueMatch(item[field], value));
  }

  static sort(data, field, order = 'asc') {
    return data.sort((a, b) => {
      if (a[field] < b[field]) return order === 'asc' ? -1 : 1;
      if (a[field] > b[field]) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  static limitOffset(data, limit, offset) {
    const startIndex = limit * offset;
    return data.slice(startIndex, startIndex + limit);
  }


  static fields(data, fields) {
    const seen = new Set();
    return data.filter(item => {
      const hash = fields.map(field => item[field]).join('|');
      if (!seen.has(hash)) {
        seen.add(hash);
        return true;
      }
      return false;
    }).map(item => {
      const selectedItem = {};
      fields.forEach(field => {
        if (item.hasOwnProperty(field)) {
          selectedItem[field] = item[field];
        }
      });
      return selectedItem;
    });
  }


  apply(data) {
    let filteredData = [...data];
    let limit, offset;
    let selectedFields = null;

    Object.keys(this.queryParams).forEach((key) => {
      const value = this.queryParams[key];

      if (key === 'sort') {
        const [field, order] = value.split(',');
        filteredData = CollectionFilter.sort(filteredData, field, order);
      } else if (key === 'limit') {
        limit = parseInt(value);
        offset = parseInt(this.queryParams['offset']) || 0;
      } else if (key === 'fields') {
        const fields = value.split(',');
        filteredData = CollectionFilter.fields(filteredData, fields);
        selectedFields = fields;
      } else if (key !== 'offset') {
        filteredData = CollectionFilter.filter(filteredData, key, value);
      }
    });

    if (limit !== undefined) {
      filteredData = CollectionFilter.limitOffset(filteredData, limit, offset);
    }

    if (selectedFields) {
      filteredData = CollectionFilter.fields(filteredData, selectedFields);
    }

    if (filteredData.length === 0) {
      const httpContext = HttpContext.get();
      httpContext.response.notFound('No data found matching the criteria');
      return null;
    }

    return filteredData;
  }

}

export default CollectionFilter;
