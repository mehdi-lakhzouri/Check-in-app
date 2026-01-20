import {
  Document,
  Model,
  UpdateQuery,
  PipelineStage,
  QueryFilter,
} from 'mongoose';
import { PaginationDto, PaginatedResult } from '../dto';

export abstract class BaseRepository<T extends Document> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const entity = new this.model(data);
    return entity.save();
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: QueryFilter<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  async findAll(filter: QueryFilter<T> = {} as QueryFilter<T>): Promise<T[]> {
    return this.model.find(filter).exec();
  }

  async findWithPagination(
    filter: QueryFilter<T>,
    pagination: PaginationDto,
    searchFields: string[] = [],
  ): Promise<PaginatedResult<T>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = pagination;
    const skip = (page - 1) * limit;

    // Build search query if search term provided
    let searchQuery: QueryFilter<T> = {} as QueryFilter<T>;
    if (search && searchFields.length > 0) {
      searchQuery = {
        $or: searchFields.map((field) => ({
          [field]: { $regex: search, $options: 'i' },
        })),
      } as QueryFilter<T>;
    }

    const combinedFilter = {
      ...filter,
      ...searchQuery,
    };

    const [data, total] = await Promise.all([
      this.model
        .find(combinedFilter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(combinedFilter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async updateById(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .exec();
  }

  async updateOne(
    filter: QueryFilter<T>,
    data: UpdateQuery<T>,
  ): Promise<T | null> {
    return this.model
      .findOneAndUpdate(filter, data, { new: true, runValidators: true })
      .exec();
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async deleteMany(filter: QueryFilter<T>): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount;
  }

  async count(filter: QueryFilter<T> = {} as QueryFilter<T>): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: QueryFilter<T>): Promise<boolean> {
    const doc = await this.model.exists(filter);
    return !!doc;
  }

  async aggregate<R>(pipeline: PipelineStage[]): Promise<R[]> {
    return this.model.aggregate(pipeline).exec();
  }
}
